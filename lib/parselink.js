'use strict'

import { d6ify, utoa, sanitize } from './utilities.js'
import { HitLocation } from '../module/hitlocation/hitlocation.js'

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

export const COSTS_REGEX = /.*\* ?(?<verb>(cost|per|costs))? (?<cost>\d+) ?(?<type>[ \w\(\)]+)/i
export const DAMAGE_REGEX =
  /^(?<accum>\+)?(?<roll>\d+)(?<D>d\d*)?(?<adds>[\–\-+]@?\w+)?(?<mult>[×x\*]\d+\.?\d*)? ?(?<div>\(-?[\.\d]+\))?(?<min>!)? ?(?<other>[^\*]*?)(?<costs>\*(costs|per)? \d+ ?[\w\(\) ]+)?(?<follow>,.*)?$/i
export const DMG_INDEX_DICE = 1
export const DMG_INDEX_D = 2
export const DMG_INDEX_ADDS = 3
export const DMG_INDEX_MULTIPLIER = 4
export const DMG_INDEX_DIVISOR = 5
export const DMG_INDEX_BANG = 6
export const DMG_INDEX_TYPE = 7
export const DMG_INDEX_COST = 8

export const DERIVED_DAMAGE_REGEX =
  /^(?<accum>\+)?(?<att>sw|thr)()(?<adds>[\–\-+]@?\w+)?(?<mult>[×x\*]\d+\.?\d*)? ?(?<div>\(-?[\.\d]+\))?(?<min>!)? ?(?<other>[^\*]*?)(?<costs>\*(costs|per)? \d+ ?[\w\(\) ]+])?(?<follow>,.*)?$/i
export const DMG_INDEX_BASICDAMAGE = 1

/**
 * @param {string} str
 * @param {string} [overridetxt]
 * @returns {{text: string, action: Action} | null}
 */
export function parseForRollOrDamage(str, overridetxt) {
  // Straight roll 4d, 2d-1, etc. Is "damage" if it includes a damage type. Allows "!" suffix to indicate minimum of 1.
  // Supports:  2d+1x3(5), 4dX2(0.5), etc
  // Straight roll, no damage type. 4d, 2d-1, etc. Allows "!" suffix to indicate minimum of 1.
  str = str.toString() // convert possible array to single string
  let a = str.match(DAMAGE_REGEX)
  if (!!a) {
    const D = a.groups.D || '' // Can now support non-variable damage '2 cut' or '2x3(1) imp'
    const other = !!a.groups.other ? a.groups.other.trim() : ''
    let [actualType, extDamageType, hitLocation] = _parseOtherForTypeModiferAndLocation(other)
    let dmap = GURPS.DamageTables.translate(actualType.toLowerCase())
    if (!dmap) {
      dmap = GURPS.DamageTables.translate(extDamageType?.toLowerCase())
      if (!!dmap) {
        actualType = extDamageType
        extDamageType = ''
      }
    }
    const woundingModifier = GURPS.DamageTables.woundModifiers[dmap]
    const [adds, multiplier, divisor, bang] = _getFormulaComponents(a.groups)

    var next
    if (a.groups.follow) {
      next = parseForRollOrDamage(a.groups.follow.substring(1).trim()) // remove ',')
      if (!!next) next = next.action
    }

    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let dice = D === 'd' ? d6ify(D) : D
      if (!dice) return null // if no damage type and no dice, not a roll, ex: [70]
      let action = {
        orig: str,
        type: 'roll',
        displayformula: a.groups.roll + D + adds + multiplier + bang,
        formula: a.groups.roll + dice + adds + multiplier + bang,
        desc: other, // Action description
        costs: a.groups.cost,
        hitlocation: hitLocation,
        accumulate: !!a.groups.accum,
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
        type: 'damage',
        formula: a.groups.roll + D + adds + multiplier + divisor + bang,
        damagetype: !!dmap ? dmap : actualType,
        extdamagetype: extDamageType,
        costs: a.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!a.groups.accum,
        next: next,
      }
      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    }
  }

  a = str.match(DERIVED_DAMAGE_REGEX) // SW+1
  if (!!a) {
    const basic = a.groups.att
    const other = !!a.groups.other ? a.groups.other.trim() : ''
    const [actualType, extDamageType, hitLocation] = _parseOtherForTypeModiferAndLocation(other)
    const dmap = GURPS.DamageTables.translate(actualType.toLowerCase())
    const woundingModifier = GURPS.DamageTables.woundModifiers[dmap]
    const [adds, multiplier, divisor, bang] = _getFormulaComponents(a.groups)

    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let action = {
        orig: str,
        type: 'derivedroll',
        derivedformula: basic,
        formula: adds + multiplier + bang,
        desc: other,
        costs: a.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!a.groups.accum,
      }
      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    } else {
      let action = {
        orig: str,
        type: 'deriveddamage',
        derivedformula: basic,
        formula: adds + multiplier + divisor + bang,
        damagetype: actualType,
        extdamagetype: extDamageType,
        costs: a.groups.costs,
        hitlocation: hitLocation,
        accumulate: !!a.groups.accum,
      }
      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    }
  }
  return null
}

/**
 * @param {Record<string, string>} matches
 */
function _parseOtherForTypeModiferAndLocation(other) {
  // change the regex from /(w+)(.*)/ to /([A-Za-z0-9_+-]+)(.*)/ to make sure we recognize pi-, pi+ and pi++
  const dmgTypeMatch = other.match(/([A-Za-z0-9_]+[+-]?\+?)(.*)/)
  const actualType = !!dmgTypeMatch ? dmgTypeMatch[1] : other // only take the first word as damage type

  // parse for hitlocation and damge modifier (extDamageType)
  let extDamageType = undefined
  let hitLocation = undefined
  if (!!dmgTypeMatch)
    if (dmgTypeMatch[2].includes('@')) {
      const [type, loc] = dmgTypeMatch[2].trim().split('@')
      extDamageType = !!type.trim() ? type.trim() : undefined
      hitLocation = !!loc.trim() ? HitLocation.translate(loc.trim()) : undefined
    } else extDamageType = dmgTypeMatch[2].trim() // 'ex' or 'inc' or more likely, undefined
  return [actualType, extDamageType, hitLocation]
}

function _getFormulaComponents(groups) {
  let adds = (groups.adds || '').replace('–', '-')
  let m = groups.other.match(/([+-]@margin)/i)
  if (!adds && !!m) {
    adds = m[1]
  }
  let multiplier = groups.mult || ''
  if (!!multiplier && 'Xx×'.includes(multiplier[0])) multiplier = '*' + multiplier.substr(1) // Must convert to '*' for Foundry.
  const divisor = groups.div || ''
  const bang = groups.min || ''
  return [adds, multiplier, divisor, bang]
}

/**
 * @param {string} str
 * @param {string | null} [htmldesc]
 * @param {boolean} clrdmods
 * @returns {{text: string, action?: Action}}
 */
export function parselink(str, htmldesc, clrdmods = false) {
  str = sanitize(str)
  if (str.length < 2) return { text: str }

  var overridetxt
  let m = str.match(/^"([^"]*)"(.*)/)
  if (m) {
    overridetxt = m[1]
    str = m[2].trim()
  } else {
    m = str.match(/^'([^']*)'(.*)/)
    if (m) {
      overridetxt = m[1]
      str = m[2].trim()
    }
  }

  let blindroll = false
  let brtxt = ''
  if (str[0] === '!') {
    blindroll = true
    str = str.substr(1).trim()
    brtxt = '(Blind Roll) '
  }

  /** Support the format @actorid@ to indicate the actor that created this OTF.  
		Most notably, it allows a GM to attack and create damage where the damage chat 
		shows the originator of the damage, not the currently selected LastActor.
		(a common problem for GMs that manage a lot of NPCs)
	*/
  var sourceId
  m = str.match(/^@([^@]+)@(.*)/)
  if (m) {
    sourceId = m[1]
    str = m[2].trim()
  }
  let dam = parseForRollOrDamage(str, overridetxt)
  if (!!dam) {
    dam.action.blindroll = blindroll
    dam.action.sourceId = sourceId
    return dam
  }

  // Modifiers
  let tmp = str.replace('–', '-').replace('\u2212', '-') // Allow display of long hyphen for minus
  m = tmp.match(/^([\+-]\d+)([^&]*)(&.*)?/)
  if (m) {
    let mod = m[1]
    let sign = mod[0]
    let desc = m[2].trim()
    if (!desc) desc = htmldesc || '' // htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
    let spantext = mod + ' ' + desc
    let def = null

    if (!!m[3]) {
      def = parselink(m[3].substr(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }

    let action = {
      orig: str,
      spantext: spantext,
      type: 'modifier',
      mod: mod,
      desc: desc,
      next: def?.action,
    }
    return {
      text: gmspan(overridetxt, spantext, action, sign == '+', clrdmods),
      action: action,
    }
  }
  m = str.match(/^([+-])@margin *([^&]*)(&.*)?/i)
  if (m) {
    let sign = m[1]
    let mod = sign + '@margin'
    let desc = mod + ' ' + m[2].trim()
    let spantext = desc
    let def = null

    if (!!m[3]) {
      def = parselink(m[3].substr(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }
    let action = {
      orig: str,
      spantext: spantext,
      type: 'modifier',
      mod: mod,
      desc: desc.trim(),
      next: def?.action,
    }
    return {
      text: gmspan(overridetxt, spantext, action, sign == '+', clrdmods),
      action: action,
    }
  }

  //Chat
  if (str[0] === '/') {
    let action = {
      quiet: blindroll,
      orig: str,
      type: 'chat',
    }
    return {
      text: gspan(overridetxt, str, action),
      action: action,
    }
  }

  // if [@margin] [then]
  m = str.match(/^@(margin|isCritSuccess|IsCritFailure) *([=<>]+ *[+-]?[\d\.]+)?$/i)
  if (!!m) {
    let action = {
      type: 'iftest',
      orig: str,
      name: m[1],
      equation: m[2],
    }
    return {
      text: str,
      action: action,
    }
  }

  //Drag and drop entries
  m = str.match(/^(\w+)\[([\.\w]+)\]({.*})/)
  if (!!m) {
    let link = m[1]
    if (
      link == 'JournalEntry' ||
      link == 'JournalEntryPage' ||
      link == 'Actor' ||
      link == 'RollTable' ||
      link == 'Item'
    ) {
      let action = {
        type: 'dragdrop',
        orig: str,
        link: m[1],
        id: m[2],
      }
      if (!!m[3]) overridetxt = m[3]
      return {
        text: gspan(overridetxt, str, action),
        action: action,
      }
    }
  }

  // Attributes "ST+2 desc, Per, Vision, etc."
  // Used A-Za-zÀ-ž\u0370-\u03FF\u0400-\u04FF instead of \w to allow non-english mappings for attributes
  m = str.match(
    /^([A-Za-zÀ-ž\u0370-\u03FF\u0400-\u04FF ]+[0-9]*)(:[A-Za-zÀ-ž\u0370-\u03FF\u0400-\u04FF \*]+)? ?([+-]\d+)? ?([^\|]*)(\|.*)?$/
  )
  if (!!m) {
    let attr = m[1].trim()
    var target
    let tmp = attr.match(/^([a-zA-Z ]+)(\d+)/)
    if (!!tmp) {
      attr = tmp[1]
      target = tmp[2] // ST26
    }
    let attrkey = attr.toUpperCase()
    // @ts-ignore
    let path = GURPS.PARSELINK_MAPPINGS[attrkey] // fright check has a space
    if (!path) {
      tmp = attr.split(' ') // but most others do not
      attr = tmp[0]
      let t = attr.match(/^([a-zA-Z ]+)(\d+)/)
      if (!!t) {
        attr = tmp[1]
        target = tmp[2]
      }
      tmp.shift()
      attrkey = attr.toUpperCase()
      path = GURPS.PARSELINK_MAPPINGS[attrkey]
      m[4] = tmp.join(' ')
    }
    if (!!path) {
      let opt = m[4].trim().match(/([^\?]*)(\? *"([^"]*)")?( *[,:] *"([^"]*)")?/) || [] // desc (searching for true/false options)
      let desc = opt[1].trim()
      let spantext = attr
      if (!!target) spantext += target
      let melee = ''
      if (!!m[2]) {
        melee = m[2].substr(1).trim()
        spantext += ':' + melee
      }
      let modifier = m[3]
      if (!!modifier) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += ' ' + modifier + ' ' + desc
      } else {
        // since I couldn't parse the margin with the initial regex, lets check for it in the description
        let mrg = desc.match(/^([+-])@margin(.*)/i)
        if (!!mrg) {
          let sign = mrg[1]
          modifier = sign + '@margin'
          desc = modifier + ' ' + mrg[2].trim()
          spantext += ' ' + desc
        } else spantext += ' ' + desc
      }
      let def = null
      if (!!m[5]) {
        def = parselink(m[5].substr(1).trim())
        if (def.action?.type == 'skill-spell' || def.action?.type == 'attribute')
          spantext += ' | ' + def.action.spantext
        else def = {}
      }
      let action = {
        orig: str,
        spantext: spantext,
        type: 'attribute',
        attribute: attr,
        attrkey: attrkey,
        name: attrkey,
        path: path,
        desc: desc,
        mod: modifier,
        blindroll: blindroll,
        next: def?.action,
        truetext: opt[3],
        falsetext: opt[5],
        target: target,
        melee: melee,
        sourceId: sourceId,
      }
      return {
        text: gspan(overridetxt, spantext, action, brtxt),
        action: action,
      }
    }
  }

  // Self control roll CR: N
  let two = str.substr(0, 2)
  if (two === 'CR' && str.length > 2 && str[2] === ':') {
    let rest = str.substr(3).trim()
    let num = rest.replace(/([0-9]+).*/g, '$1')
    let desc = rest.replace(/[0-9]+ *(.*)/g, '$1')
    let action = {
      orig: str,
      type: 'controlroll',
      target: parseInt(num),
      desc: desc,
      blindroll: blindroll,
      sourceId: sourceId,
    }
    return {
      text: gspan(overridetxt, str, action, brtxt),
      action: action,
    }
  }

  // for PDF link
  let pdf = str.replace(/^PDF: */gi, '')
  if (pdf != str) {
    return {
      text: "<span class='pdflink' data-pdf='" + pdf + "'>" + (overridetxt || pdf) + '</span>',
      action: {
        orig: str,
        type: 'pdf',
        link: pdf,
      },
    } // Just get rid of the "[PDF:" and allow the pdflink css class to do most of the work
  }

  // Simple, no-spaces, no quotes skill/spell name (with optional *)
  // Pattern:
  //  - S:
  //  - ([^\| "+-]+\*?) - NAME - any run of characters that do not include space, |, ", +, -, followed by optional *
  //  -  ? - optional space
  //  - ([-+]\d+)? - MODIIFER - optional modifier (+17, -2, etc...)
  //  -  ? - optional space
  //  - ([^\|])* - COMMENT - zero or more run of characters that do not include |
  //  - (\|.*)? - REMAINDER - | followed by any run of characters (optional)
  //
  let parse = str.replace(/^S[pkPK]?:"([^"]+)" ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
  if (parse === str) {
    parse = str.replace(/^S[pkPK]?:'([^']+)' ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
    // Use quotes to capture skill/spell name (with as many * as they want to embed)
    // if (parse == str) parse = str.replace(/^S[pkPK]?:([^\| \?\(+-]+\*?) ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
    if (parse === str) parse = str.replace(/^S[pkPK]?:([^\| \?\(\+\-]+(?:-[^\| \?\(\+\-]+)?) ?([+-]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
  }

  if (parse !== str) {
    let a = parse.split('~')
    let name = a[0].trim() // semi-regex pattern of skill/spell name (minus quotes)
    if (!!name) {
      let spantext = name // What we show in the highlighted span (yellow)
      let moddesc = ''
      let comment = a[2]
      let modifierText = a[1]

      // examine the description to see if this is a 'floating' skill
      let floatingAttribute = null
      let floatingLabel = null
      let floatingType = null
      let matches = comment.match(/(\((Based|Base|B): ?[^\)]+\))/gi)
      if (!!matches) {
        floatingLabel = comment.replace(/.*\((Based|Base|B): ?([^\)]+)\).*/gi, '$2')
        //console.log(`floating ${floatingLabel}`)

        comment = comment
          .replace(/(\((Based|Base|B): ?[^\)]+\))/g, '')
          .replace('  ', ' ')
          .trim()
        //console.log(`comment ${comment}`)

        // floatingAttribute must be an attribute
        let attribute = parselink(floatingLabel)
        if (attribute.action?.type === 'attribute' || attribute.action?.type === 'mapped') {
          floatingAttribute = attribute.action.path
          floatingType = attribute.action.type
        } else {
          floatingLabel = null
        }
      }
      var costs
      matches = comment.match(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/i)
      if (!!matches) {
        costs = matches[0]
        spantext += ' ' + costs
        comment = comment
          .replace(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/gi, '')
          .replace('  ', ' ')
          .trim()
      }

      matches = comment.match(/([^\?]*)(\? *"([^"]*)")?( *[,:] *"([^"]*)")?/) || [] // desc

      moddesc = matches[1].trim()
      if (!!modifierText) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += ' ' + modifierText
        if (!!moddesc) spantext += ' ' + moddesc
      } else {
        // since I couldn't parse the margin with the initial regex, lets check for it in the description
        let mrg = moddesc.match(/^([+-])@margin(.*)/i)
        if (!!mrg) {
          let sign = mrg[1]
          modifierText = sign + '@margin'
          moddesc = modifierText + ' ' + mrg[2].trim()
          spantext += ' ' + moddesc
        }
      }

      if (!!floatingAttribute) {
        spantext += ` (Based:${floatingLabel})`
      }

      if (!modifierText && !!moddesc) spantext += ' ' + moddesc // just a regular comment

      let def = null
      if (!!a[3]) {
        def = parselink(a[3].substr(1).trim())
        if (def.action?.type == 'skill-spell' || def.action?.type == 'attribute')
          spantext += ' | ' + def.action.spantext
        else def = {}
      }
      let target = name.match(/(.*)=(\d+)/) // Targeted rolls 'Skill=12'
      let isSpell = !!str.match(/^SP/i)
      let isSkill = !!str.match(/^SK/i)
      let prefix = brtxt + '<b>S:</b>'
      if (isSpell) prefix = brtxt + '<b>Sp:</b>'
      if (isSkill) prefix = brtxt + '<b>Sk:</b>'
      let action = {
        orig: str,
        type: 'skill-spell',
        isSpellOnly: isSpell,
        isSkillOnly: isSkill,
        name: !!target ? target[1] : name,
        target: !!target ? target[2] : undefined,
        mod: modifierText,
        desc: moddesc,
        blindroll: blindroll,
        next: def?.action,
        spantext: prefix + spantext,
        floatingAttribute: floatingAttribute,
        floatingType: floatingType,
        floatingLabel: floatingLabel,
        truetext: matches[3],
        falsetext: matches[5],
        costs: costs,
        sourceId: sourceId,
      }

      return {
        text: gspan(overridetxt, spantext, action, prefix),
        action: action,
      }
    }
  }

  // Use quotes to capture skill/spell name (with optional *s), first try double quotes, then single quotes, then
  // Simple, no-spaces, no quotes melee/ranged name (with optional *s)
  parse = str.replace(/^[MRADPB]:"([^"]+)" ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')
  if (parse == str) parse = str.replace(/^[MRADPB]:'([^']+)' ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')
  if (parse == str) parse = str.replace(/^[MRADPB]:([^ "+-]+\*?) ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')

  if (parse != str) {
    let a = parse.split('~')
    let n = a[0].trim() // semi-regex pattern of skill/spell name (minus quotes)
    if (!!n) {
      let moddesc = ''
      let comment = a[2]
      let matches = comment.match(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/i)
      var costs
      if (!!matches) {
        costs = matches[0]
        comment = comment
          .replace(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/gi, '')
          .replace('  ', ' ')
          .trim()
      }
      matches = comment.match(/^\(.*\)$/) // Merge '(XXX)' into name
      if (!!matches) {
        n += ' ' + comment
        comment = ''
      }
      let spantext = n // What we show in the highlighted span (yellow)
      let modifier = a[1]
      if (!!modifier) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += modifier
        if (!!comment) {
          spantext += ' ' + comment
          moddesc = comment
        }
        comment = ''
      } else {
        // since I couldn't parse the margin with the initial regex, lets check for it in the description
        let mrg = comment.match(/^([+-])@margin(.*)/i)
        if (!!mrg) {
          let sign = mrg[1]
          modifier = sign + '@margin'
          moddesc = modifier + ' ' + mrg[2].trim()
          spantext += ' ' + moddesc
          comment = ''
        }
      }

      if (!!costs) spantext += ' ' + costs
      let isMelee = !!str.match(/^[AMDPB]/i)
      let isRanged = !!str.match(/^[ARD]/i)
      let type = 'attack'
      if (!!str.match(/^D/i)) type = 'attackdamage'
      if (!!str.match(/^P/i)) type = 'weapon-parry'
      if (!!str.match(/^B/i)) type = 'weapon-block'
      let action = {
        orig: str,
        type: type,
        name: n,
        mod: modifier,
        desc: moddesc,
        blindroll: blindroll,
        costs: costs,
        isMelee: isMelee,
        isRanged: isRanged,
        sourceId: sourceId,
      }
      return {
        text: gspan(overridetxt, spantext, action, brtxt + '<b>' + str[0].toUpperCase() + ':</b>', comment),
        action: action,
      }
    }
  }

  m = str.match(/^\?([AMRS][TDPK]?):(.*)/i)
  if (!!m) {
    let name = m[2]
    let quotes = name.match(/^['"](.*)['"]/)
    if (!!quotes) name = quotes[1]
    let action = {
      orig: str,
      type: 'test-exists',
      prefix: m[1].toUpperCase(),
      name: name,
    }
    return {
      text: gspan(overridetxt, str, action),
      action: action,
    }
  }

  m = str.match(/https?:\/\//i)
  if (!!m) {
    let lbl = !!overridetxt ? overridetxt : str
    let action = {
      orig: str,
      label: lbl,
      type: 'href',
    }
    return { action: action, text: `<a href="${str}">${lbl}</a>` }
  }

  return { text: str }
}

/**
 * @param {string | undefined} overridetxt
 * @param {string} str
 * @param {Action} action
 * @param {boolean} plus
 * @param {boolean} clrdmods
 */
function gmspan(overridetxt, str, action, plus, clrdmods) {
  if (!!overridetxt) {
    str = overridetxt
    action.overridetxt = overridetxt
  }
  let a = !!action
    ? " data-action='" +
      utoa(JSON.stringify(action)) +
      "' data-otf='" +
      (!!action.blindroll ? '!' : '') +
      action.orig +
      "'"
    : ''
  if (action.type === 'modifier') {
    if (str.startsWith('-')) str = '&minus;' + str.slice(1) // \u2212
  }
  let s = `<span class='glinkmod'${a}>${str}`
  if (clrdmods) {
    if (plus) s = `<span class='glinkmodplus'${a}>${str}`
    else s = `<span class='glinkmodminus'${a}>${str}`
  }
  return s + '</span>'
}

/**
 * @param {string | undefined} overridetxt
 * @param {string} str
 * @param {Action} action
 * @param {string | undefined} [prefix]
 * @param {string | undefined} [comment]
 */
export function gspan(overridetxt, str, action, prefix, comment) {
  if (!!overridetxt) {
    str = overridetxt
    prefix = ''
    comment = ''
    action.overridetxt = overridetxt
  }
  let s = "<span class='gurpslink'"
  if (!!action)
    s +=
      " data-action='" +
      utoa(JSON.stringify(action)) +
      "' data-otf='" +
      (!!action.blindroll ? '!' : '') +
      action.orig +
      "'"
  s += '>' + (!!prefix ? prefix : '') + str.trim() + '</span>'
  if (!!comment) s += ' ' + comment
  return s
}
