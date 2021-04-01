'use strict'

import { GURPS } from '../module/gurps.js'
import { DamageTables } from '../module/damage/damage-tables.js'
import { d6ify, utoa, atou } from './utilities.js'

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
*/

export const DAMAGE_REGEX = /^(\d+)(d\d*)?([-+]\d+)?([xX\*]\d+)? ?(\(-?[\.\d]+\))?(!)? ?([^\*]*)(\*[Cc]osts? \d+[Ff][Pp])?$/
export const DMG_INDEX_DICE = 1
export const DMG_INDEX_D = 2
export const DMG_INDEX_ADDS = 3
export const DMG_INDEX_MULTIPLIER = 4
export const DMG_INDEX_DIVISOR = 5
export const DMG_INDEX_BANG = 6
export const DMG_INDEX_TYPE = 7
export const DMG_INDEX_COST = 8

export const DERIVED_DAMAGE_REGEX = /^(SW|Sw|sw|THR|Thr|thr)()([-+]\d+)?([xX\*]\d+)? ?(\(-?[\.\d]+\))?(!)? ?([^\*]*)(\*[Cc]osts? \d+[Ff][Pp])?$/ // have fake 2nd element so indexes match
export const DMG_INDEX_BASICDAMAGE = 1

export function parseForDamage(str) {
  // Straight roll 4d, 2d-1, etc. Is "damage" if it includes a damage type.  Allows "!" suffix to indicate minimum of 1.
  // Supports:  2d+1x3(5), 4dX2(0.5), etc
  // Straight roll, no damage type. 4d, 2d-1, etc.   Allows "!" suffix to indicate minimum of 1.
  let a = str.match(DAMAGE_REGEX)
  if (!!a) {
    const D = a[DMG_INDEX_D] || '' // Can now support non-variable damage '2 cut' or '2x3(1) imp'
    const damageType = !!a[DMG_INDEX_TYPE] ? a[DMG_INDEX_TYPE].trim() : ''

    // change the regex from /(w+)(.*)/ to /([A-Za-z0-9_+-]+)(.*)/ to make sure we recognize pi-, pi+ and pi++
    const dmgTypeMatch = damageType.match(/([A-Za-z0-9_+-]+)(.*)/)
    const actualType = !!dmgTypeMatch ? dmgTypeMatch[1] : damageType // only take the first word as damage

    const extDamageType = !!dmgTypeMatch ? dmgTypeMatch[2] : undefined // 'ex' or 'inc' or more likely, undefined
    const dmap = DamageTables.translate(actualType.toLowerCase())
    const woundingModifier = DamageTables.woundModifiers[dmap]

    const adds = a[DMG_INDEX_ADDS] || ''
    let multiplier = a[DMG_INDEX_MULTIPLIER] || ''
    if (!!multiplier && 'Xx'.includes(multiplier[0])) multiplier = '*' + multiplier.substr(1) // Must convert to '*' for Foundry.
    const divisor = a[DMG_INDEX_DIVISOR] || ''
    const bang = a[DMG_INDEX_BANG] || ''

    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let dice = D === 'd' ? d6ify(D) : D
      let action = {
        orig: str,
        type: 'roll',
        displayformula: a[DMG_INDEX_DICE] + D + adds + multiplier + bang,
        formula: a[DMG_INDEX_DICE] + dice + adds + multiplier + bang,
        desc: damageType, // Action description
        costs: a[DMG_INDEX_COST],
      }
      return {
        text: gspan(str, action),
        action: action,
      }
    } else {
      // Damage roll 1d+2 cut.
      let action = {
        orig: str,
        type: 'damage',
        formula: a[DMG_INDEX_DICE] + D + adds + multiplier + divisor + bang,
        damagetype: !!dmap ? dmap : actualType,
        extdamagetype: extDamageType,
        costs: a[DMG_INDEX_COST],
      }
      return {
        text: gspan(str, action),
        action: action,
      }
    }
  }

  a = str.match(DERIVED_DAMAGE_REGEX) // SW+1
  if (!!a) {
    const basic = a[DMG_INDEX_BASICDAMAGE]
    const damageType = !!a[DMG_INDEX_TYPE] ? a[DMG_INDEX_TYPE].trim() : ''
    const dmgTypeMatch = damageType.match(/(\w+)(.*)/)
    const actualType = !!dmgTypeMatch ? dmgTypeMatch[1] : damageType // only take the first word as damage
    const extDamageType = !!dmgTypeMatch ? dmgTypeMatch[2] : undefined // 'ex' or 'inc' or more likely, undefined
    const dmap = DamageTables.translate(actualType.toLowerCase())
    const woundingModifier = DamageTables.woundModifiers[dmap]
    const adds = a[DMG_INDEX_ADDS] || ''
    let multiplier = a[DMG_INDEX_MULTIPLIER] || ''
    if (!!multiplier && 'Xx'.includes(multiplier[0])) multiplier = '*' + multiplier.substr(1) // Must convert to '*' for Foundry.
    const divisor = a[DMG_INDEX_DIVISOR] || ''
    const bang = a[DMG_INDEX_BANG] || ''
    if (!woundingModifier) {
      // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
      let action = {
        orig: str,
        type: 'derivedroll',
        derivedformula: basic,
        formula: adds + multiplier + bang,
        desc: damageType,
        costs: a[DMG_INDEX_COST],
      }
      return {
        text: gspan(str, action),
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
        costs: a[DMG_INDEX_COST],
      }
      return {
        text: gspan(str, action),
        action: action,
      }
    }
  }
  return null
}

export function parselink(str, htmldesc, clrdmods = false) {
  str = str.replace(/%(?![0-9][0-9a-fA-F]+)/g, '%25')
  str = decodeURIComponent(str) // convert % (not followed by 2 digit hex) to %25, unicode characters into html format
  str = str.replace(/&nbsp;/g, ' ') // we need to convert non-breaking spaces into regular spaces for parsing
  str = str.replace(/&amp;/g, '&') // we need to convert to & for easier parsing
  str = str.replace(/(&#215;|&#xD7;|&times)/g, 'x') // we need to convert the multiplication symbol to x for easier parsing
  str = str.replace(/(<([^>]+)>)/gi, '') // remove <html> tags
  if (str.length < 2) return { text: str }

  // Modifiers
  let m = str.match(/^([+-]\d+)([^&]*)(&.*)?/)
  if (m) {
    let sign = m[1][0]
    let desc = m[2].trim()
    if (!desc) desc = htmldesc || '' // htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
    let spantext = m[1] + ' ' + desc
    let def = m[3]
    if (!!def) {
      def = parselink(def.substr(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }

    let action = {
      orig: str,
      spantext: spantext,
      type: 'modifier',
      mod: m[1],
      desc: desc,
      next: def?.action,
    }
    return {
      text: gmspan(spantext, action, sign == '+', clrdmods),
      action: action,
    }
  }

  //Chat
  if (str[0] === '/') {
    let action = {
      orig: str,
      type: 'chat',
    }
    return {
      text: gspan(str, action),
      action: action,
    }
  }

  let blindroll = false
  let brtxt = ''
  if (str[0] === '!') {
    blindroll = true
    str = str.substr(1)
    brtxt = '&lt;Blind Roll&gt; '
  }

  // Attributes "ST+2 desc, Per, Vision, etc."
  m = str.match(/^([\w ]+)(:[\w \*]+)? ?([+-]\d+)? ?([^\|]*)(\|.*)?$/)
  if (!!m) {
    let attr = m[1].trim()
    var target
    let tmp = attr.match(/^([a-zA-Z ]+)(\d+)/)
    if (!!tmp) {
      attr = tmp[1]
      target = tmp[2] // ST26
    }
    let path = GURPS.PARSELINK_MAPPINGS[attr] // fright check has a space
    if (!path) {
      tmp = attr.split(' ') // but most others do not
      attr = tmp[0]
      let t = attr.match(/^([a-zA-Z ]+)(\d+)/)
      if (!!t) {
        attr = tmp[1]
        target = tmp[2]
      }
      tmp.shift()
      path = GURPS.PARSELINK_MAPPINGS[attr]
      m[4] = tmp.join(' ')
    }
    if (!!path) {
      let opt = m[4].trim().match(/([^\?]*)(\? *"([^"]*)")?( *[,:] *"([^"]*)")?/) // desc
      let spantext = attr
      if (!!target) spantext += target
      let melee = ''
      if (!!m[2]) {
        melee = m[2].substr(1).trim()
        spantext += ':' + melee
      }
      if (!!m[3]) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += ' ' + m[3] + ' ' + opt[1].trim()
      } else spantext += ' ' + opt[1].trim()
      let def = m[5]
      if (!!def) {
        def = parselink(def.substr(1).trim())
        if (def.action?.type == 'skill-spell' || def.action?.type == 'attribute')
          spantext += ' | ' + def.action.spanttext
        else def = {}
      }
      let action = {
        orig: str,
        spanttext: spantext,
        type: 'attribute',
        attribute: attr,
        path: path,
        desc: opt[1].trim(),
        mod: m[3],
        blindroll: blindroll,
        next: def?.action,
        truetext: opt[3],
        falsetext: opt[5],
        target: target,
        melee: melee,
      }
      return {
        text: gspan(spantext, action, brtxt),
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
    }
    return {
      text: gspan(str, action, brtxt),
      action: action,
    }
  }

  m = parseForDamage(str)
  if (!!m) return m

  // for PDF link
  m = str.replace(/^PDF: */g, '')
  if (m != str) {
    return {
      text: "<span class='pdflink'>" + m + '</span>',
      action: {
        orig: str,
        type: 'pdf',
        link: m,
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
  let parse = str.replace(/^S:"([^"]+)" ?([-+]\d+)? ?([^\|]*)(\|.*)?/g, '$1~$2~$3~$4')
  if (parse == str) {
    // Use quotes to capture skill/spell name (with as many * as they want to embed)
    parse = str.replace(/^S:([^\| \?\(+-]+\*?) ?([-+]\d+)? ?([^\|]*)(\|.*)?/g, '$1~$2~$3~$4')
  }

  if (parse != str) {
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
      let matches = comment.match(/(\((Based|Base|B): ?[^\)]+\))/g)
      if (!!matches) {
        floatingLabel = comment.replace(/.*\((Based|Base|B): ?([^\)]+)\).*/g, '$2')
        console.log(`floating ${floatingLabel}`)

        comment = comment
          .replace(/(\((Based|Base|B): ?[^\)]+\))/g, '')
          .replace('  ', ' ')
          .trim()
        console.log(`comment ${comment}`)

        // floatingAttribute must be an attribute
        let attribute = parselink(floatingLabel)
        if (attribute.action.type === 'attribute' || attribute.action.type === 'mapped') {
          floatingAttribute = attribute.action.path
          floatingType = attribute.action.type
        } else {
          floatingLabel = null
        }
      }
      var costs
      matches = comment.match(/\* ?Costs? (\d+) ?fp/i)
      if (!!matches) {
        costs = matches[0]
        spantext += ' ' + costs
        comment = comment
          .replace(/\* ?Costs? (\d+) ?fp/gi, '')
          .replace('  ', ' ')
          .trim()
      }

      matches = comment.match(/([^\?]*)(\? *"([^"]*)")?( *[,:] *"([^"]*)")?/) // desc

      moddesc = matches[1].trim()
      if (!!modifierText) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += ' ' + modifierText
        if (!!moddesc) spantext += ' ' + moddesc
      }

      if (!!floatingAttribute) {
        spantext += ` (Based:${floatingLabel})`
      }

      if (!modifierText && !!moddesc) spantext += ' ' + moddesc // just a regular comment

      let def = a[3]
      if (!!def) {
        def = parselink(def.substr(1).trim())
        if (def.action?.type == 'skill-spell' || def.action?.type == 'attribute')
          spantext += ' | ' + def.action.spanttext
        else def = {}
      }
      let target = name.match(/(.*)=(\d+)/) // Targeted rolls 'Skill=12'
      let prefix = brtxt + '<b>S:</b>'
      let action = {
        orig: str,
        type: 'skill-spell',
        name: !!target ? target[1] : name,
        target: !!target ? target[2] : undefined,
        mod: modifierText,
        desc: moddesc,
        blindroll: blindroll,
        next: def?.action,
        spanttext: prefix + spantext,
        floatingAttribute: floatingAttribute,
        floatingType: floatingType,
        floatingLabel: floatingLabel,
        truetext: matches[3],
        falsetext: matches[5],
        costs: costs,
      }

      return {
        text: gspan(spantext, action, prefix),
        action: action,
      }
    }
  }

  // Simple, no-spaces, no quotes melee/ranged name (with optional *s)
  parse = str.replace(/^A:([^ "+-]+\*?) ?([-+]\d+)? ?(.*)/g, '$1~$2~$3')
  if (parse == str) {
    // Use quotes to capture skill/spell name (with optional *s)
    parse = str.replace(/^A:"([^"]+)" ?([-+]\d+)? ?(.*)/g, '$1~$2~$3')
  }
  if (parse != str) {
    let a = parse.split('~')
    let n = a[0].trim() // semi-regex pattern of skill/spell name (minus quotes)
    if (!!n) {
      let spantext = n // What we show in the highlighted span (yellow)
      let moddesc = ''
      let comment = a[2]
      let matches = comment.match(/\* ?Costs? (\d+) ?fp/i)
      var costs
      if (!!matches) {
        costs = matches[0]
        comment = comment
          .replace(/\* ?Costs? (\d+) ?fp/gi, '')
          .replace('  ', ' ')
          .trim()
      }
      if (!!a[1]) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += a[1]
        if (!!comment) {
          spantext += ' ' + comment
          moddesc = comment
        }
        comment = ''
      }
      if (!!costs)
        spantext += ' ' + costs
      let action = {
        orig: str,
        type: 'attack',
        name: n,
        mod: a[1],
        desc: moddesc,
        blindroll: blindroll,
        costs: costs
      }
      return {
        text: gspan(spantext, action, brtxt + '<b>A:</b>', comment),
        action: action,
      }
    }
  }

  return { text: str }
}

function gmspan(str, action, plus, clrdmods) {
  let a = !!action ? " data-action='" + utoa(JSON.stringify(action)) + "' data-otf='" + (!!action.blindroll ? "!" : "") + action.orig + "'" : ''
  let s = `<span class='glinkmod'${a}>${str}`
  if (clrdmods) {
    if (plus) s = `<span class='glinkmodplus'${a}>${str}`
    else s = `<span class='glinkmodminus'${a}>${str}`
  }
  return s + '</span>'
}

export function gspan(str, action, prefix, comment) {
  let s = "<span class='gurpslink'"
  if (!!action) s += " data-action='" + utoa(JSON.stringify(action)) + "' data-otf='" + (!!action.blindroll ? "!" : "") + action.orig + "'"
  s += '>' + (!!prefix ? prefix : '') + str.trim() + '</span>'
  if (!!comment) s += ' ' + comment
  return s
}
