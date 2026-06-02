/* Here is where we do all the work to try to parse the text inbetween [ ].
 Supported formats:
  +N <desc>
  -N <desc>
	add a modifier to the stack, using text as the description
  ST/IQ/DX[+-]N <desc>
	attribute roll with optional add/subtract
  CR: N <desc>
	Self control roll
  "Skill*" +/-N
	Roll vs skill (with option +/- mod)
  "ST12"
  "SW+1"/"THR-1"
  "PDF:B102"

  "modifier", "attribute", "selfcontrol", "damage", "roll", "skill", "pdf"

  (\(-?[\.\d]+\))? == (-.#)
*/

import { HitLocation } from '@module/hitlocation/hitlocation.js'
import { d6ify, sanitize } from '@util/utilities.js'

import { gspan, PARSERS } from './otf-parsers.js'
import { OtfActionType } from './types.js'

export const COSTS_REGEX = /.*\* ?(?<verb>(cost|per|costs))? (?<cost>\d*) ?(?<type>[ \w()]+)/i
export const DAMAGE_REGEX =
  /^(?<accum>\+)?(?<roll>\d+)(?<D>d\d*)?(?<adds>[–\-+]@?\w+)?(?<mult>[×x*]\d+\.?\d*)? ?(?<div>\(-?[.\d]+\))?(?<min>!)? ?(?<other>[^*]*?)(?<costs>\*(costs|per)? \d+ ?[\w() ]+)?(?<follow>,.*)?$/i
export const DMG_INDEX_DICE = 1
export const DMG_INDEX_D = 2
export const DMG_INDEX_ADDS = 3
export const DMG_INDEX_MULTIPLIER = 4
export const DMG_INDEX_DIVISOR = 5
export const DMG_INDEX_BANG = 6
export const DMG_INDEX_TYPE = 7
export const DMG_INDEX_COST = 8

export const DERIVED_DAMAGE_REGEX =
  /^(?<accum>\+)?(?<att>swing|thrust|sw|thr)\s*(?<adds>[–\-+]@?\w+)?(?<mult>[×x*]\d+\.?\d*)? ?(?<div>\(-?[.\d]+\))?(?<min>!)? ?(?<other>[^*]*?)(?<costs>\*(costs|per)? \d+ ?[\w() ]+)?(?<follow>,.*)?$/i
export const DMG_INDEX_BASICDAMAGE = 1

export const PARSELINK_MAPPINGS = {
  ST: 'attributes.ST.value',
  DX: 'attributes.DX.value',
  IQ: 'attributes.IQ.value',
  HT: 'attributes.HT.value',
  QN: 'attributes.QN.value',
  WILL: 'attributes.WILL.value',
  PER: 'attributes.PER.value',
  VISION: 'vision',
  FRIGHTCHECK: 'frightcheck',
  'FRIGHT CHECK': 'frightcheck',
  HEARING: 'hearing',
  TASTESMELL: 'tastesmell',
  'TASTE SMELL': 'tastesmell',
  TASTE: 'tastesmell',
  SMELL: 'tastesmell',
  TOUCH: 'touch',
  DODGE: 'currentdodge',
  Parry: 'equippedparry',
  PARRY: 'equippedparry',
  BLOCK: 'equippedblock',
}

/**
 * @param {string} str
 * @param {string | null} [htmldesc]
 * @param {boolean} clrdmods
 * @returns {{text: string, action?: Action}}
 */
export function parselink(input, htmldesc, clrdmods = false) {
  let args = { str: sanitize(input), htmldesc: htmldesc, clrdmods: clrdmods }

  // Allow display of long hyphen for minus
  args.str = args.str.replace('–', '-').replace('\u2212', '-')
  // Convert any escaped quotes.
  args.str = args.str.replace(/\\"/g, '*').replace(/\\'/g, '*')

  if (args.str.length < 2) return { text: args.str }

  //  An OTF can begin with a quoted string, which is the overridetxt.
  //  This is used to display something else besides the actual OTF.
  setOverrideText(args)

  // After the overridetxt, the next character can be a '!' to indicate a blind roll.
  setBlindRoll(args)

  // Support the format @actorid@ to indicate the actor that created this OTF.
  // Most notably, it allows a GM to attack and create damage where the damage chat
  // shows the originator of the damage, not the currently selected LastActor.
  // (a common problem for GMs that manage a lot of NPCs).
  // E.g., @actorid@ 2d-1 cut, @actorid@ IQ-4, etc.
  setSourceId(args)

  let dam = parseForRollOrDamage(args.str, args.overridetxt)

  if (dam) {
    dam.action.blindroll = args.blindroll
    dam.action.sourceId = args.sourceId

    return dam
  }

  for (const parser of PARSERS) {
    let result

    if ((result = parser.parse_(args))) return result
  }

  return { text: args.str }

  function setSourceId(args) {
    let matches = args.str.match(/^@(?<actorid>[^@]+)@(?<text>[\s\S]*)/)

    if (matches) {
      args.sourceId = matches.groups.actorid
      args.str = matches.groups.text.trim()
    }
  }

  function setBlindRoll(args) {
    args.blindroll = false

    if (args.str[0] === '!') {
      args.blindroll = true
      args.str = args.str.slice(1).trim()
    }
  }

  function setOverrideText(args) {
    let match = args.str.match(/^"(?<overridetext>[^"]*)"(?<text>[\s\S]*)/)

    if (match) {
      args.overridetxt = match.groups?.overridetext
      args.str = match.groups?.text.trim()
    } else {
      match = args.str.match(/^'(?<overridetext>[^']*)'(?<text>[\s\S]*)/)

      if (match) {
        args.overridetxt = match.groups?.overridetext
        args.str = match.groups?.text.trim()
      }
    }
  }
}

/**
 * @param {string} str
 * @param {string} [overridetxt]
 * @returns {{text: string, action: Action} | null}
 */
export function parseForRollOrDamage(str, overridetxt) {
  // Straight roll 4d, 2d-1, etc. Is "damage" if it includes a damage type. Allows "!" suffix to indicate minimum of 1.
  // Supports:  2d+1x3(5), 4dX2(0.5), etc
  // Straight roll, no damage type. 4d, 2d-1, etc. Allows "!" suffix to indicate minimum of 1.
  if (str instanceof Set) str = Array.from(str)
  str = str.toString() // convert possible array to single string

  let array = str.match(DAMAGE_REGEX)

  if (array) {
    const DICE = array.groups.D || '' // Can now support non-variable damage '2 cut' or '2x3(1) imp'
    const other = array.groups.other ? array.groups.other.trim() : ''
    let [actualType, extDamageType, hitLocation] = _parseOtherForTypeModiferAndLocation(other)
    let dmap = GURPS.DamageTables.translate(actualType.toLowerCase())

    if (!dmap) {
      dmap = GURPS.DamageTables.translate(extDamageType?.toLowerCase())

      if (dmap) {
        actualType = extDamageType
        extDamageType = undefined
      }
    }

    const woundingModifier = GURPS.DamageTables.woundModifiers[dmap]
    const [adds, multiplier, divisor, bang] = _getFormulaComponents(array.groups)

    var next

    if (array.groups.follow) {
      next = parseForRollOrDamage(array.groups.follow.substring(1).trim()) // remove ',')
      if (next) next = next.action
    }

    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let dice = DICE === 'd' ? d6ify(DICE) : DICE

      if (!dice) return undefined // if no damage type and no dice, not a roll, ex: [70]
      let action = {
        orig: str,
        type: OtfActionType.roll,
        displayformula: array.groups.roll + DICE + adds + multiplier + bang,
        formula: array.groups.roll + dice + adds + multiplier + bang,
        desc: other, // Action description
        costs: array.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!array.groups.accum,
        next: next,
      }

      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    } else {
      // Damage roll 1d+2 cut.
      let action = {
        orig: str,
        type: OtfActionType.damage,
        formula: array.groups.roll + DICE + adds + multiplier + divisor + bang,
        damagetype: dmap ? dmap : actualType,
        extdamagetype: extDamageType,
        costs: array.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!array.groups.accum,
        next: next,
      }

      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    }
  }

  array = str.match(DERIVED_DAMAGE_REGEX) // SW+1

  if (array) {
    const basic = array.groups.att
    const other = array.groups.other ? array.groups.other.trim() : ''
    const [actualType, extDamageType, hitLocation] = _parseOtherForTypeModiferAndLocation(other)
    const dmap = GURPS.DamageTables.translate(actualType.toLowerCase())
    const woundingModifier = GURPS.DamageTables.woundModifiers[dmap]
    const [adds, multiplier, divisor, bang] = _getFormulaComponents(array.groups)

    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let action = {
        orig: str,
        type: OtfActionType.derivedRoll,
        derivedformula: basic,
        formula: adds + multiplier + bang,
        desc: other,
        costs: array.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!array.groups.accum,
      }

      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    } else {
      let action = {
        orig: str,
        type: OtfActionType.derivedDamage,
        derivedformula: basic,
        formula: adds + multiplier + divisor + bang,
        damagetype: actualType,
        extdamagetype: extDamageType,
        costs: array.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!array.groups.accum,
      }

      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    }
  }

  return undefined
}

/**
 * @param {Record<string, string>} matches
 */
function _parseOtherForTypeModiferAndLocation(other) {
  // change the regex from /(w+)(.*)/ to /([A-Za-z0-9_+-]+)(.*)/ to make sure we recognize pi-, pi+ and pi++
  const dmgTypeMatch = other.match(/([A-Za-z0-9_]+[+-]?\+?)(.*)/)
  const actualType = dmgTypeMatch ? dmgTypeMatch[1] : other // only take the first word as damage type

  // parse for hitlocation and damge modifier (extDamageType)
  let extDamageType = undefined
  let hitLocation = undefined

  if (dmgTypeMatch)
    if (dmgTypeMatch[2].includes('@')) {
      const [type, loc] = dmgTypeMatch[2].trim().split('@')

      extDamageType = type.trim() ? type.trim() : undefined
      hitLocation = loc.trim() ? HitLocation.translate(loc.trim()) : undefined
    } else extDamageType = dmgTypeMatch[2].trim() ? dmgTypeMatch[2].trim() : undefined // 'ex' or 'inc' or more likely, undefined

  return [actualType, extDamageType, hitLocation]
}

function _getFormulaComponents(groups) {
  let adds = (groups.adds || '').replace('–', '-')
  let matches = groups.other.match(/([+-]@margin)/i)

  if (!adds && !!matches) {
    adds = matches[1]
  }

  let multiplier = groups.mult || ''

  if (!!multiplier && 'Xx×'.includes(multiplier[0])) multiplier = '*' + multiplier.substr(1) // Must convert to '*' for Foundry.
  const divisor = groups.div || ''
  const bang = groups.min || ''

  return [adds, multiplier, divisor, bang]
}
