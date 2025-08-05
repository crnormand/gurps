'use strict'

import { HitLocation } from '../module/hitlocation/hitlocation.js'
import { d6ify, sanitize, utoa } from './utilities.js'

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
  /^(?<accum>\+)?(?<att>swing|thrust|sw|thr)\s*(?<adds>[\–\-+]@?\w+)?(?<mult>[×x\*]\d+\.?\d*)? ?(?<div>\(-?[\.\d]+\))?(?<min>!)? ?(?<other>[^\*]*?)(?<costs>\*(costs|per)? \d+ ?[\w\(\) ]+])?(?<follow>,.*)?$/i
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

const _httpLink = {
  // Matches any string that starts with "http://"" or "https://".
  regex: /^https?:\/\/.*/,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'href',
   *    label: string,
   *   }
   * }
   */
  parse: (match, args) => {
    let action = {
      orig: match.input,
      type: 'href',
      label: !!args.overridetxt ? args.overridetxt : match.input,
    }
    return {
      text: `<a href="${match.input}">${args.overridetxt || match.input}</a>`,
      action: action,
    }
  },
}

const _modifier = {
  /**
   * Matches a list of Modifiers, separated by "&":
   *  • modifier-list = modifier { [ " " ] "&" [ " " ] modifier }
   *
   * Where:
   *  • modifier = sign mod-value [ " " mod-description ]
   *  • sign = "+" | "-"
   *  • positive-integer = digit { digit }
   *  • mod-value = positive-integer | "@margin"
   *  • mod-description = ( text - "&" ) -- Any string that does not contain the '&' character.
   */
  regex: /^(?<signednum>[\+-]\d+)(?<modtext>[^&]*)(?<othermods>&.*)?/,

  /**
   * @returns {
   * text: string,
   * action: {
   *   orig: string,
   *   spantext: string,
   *   type: 'modifier',
   *   mod?: string,
   *   desc?: string,
   *   next?: Action
   * }
   */
  parse: (match, args) => {
    let mod = match.groups.signednum
    let sign = mod[0]
    let desc = match.groups.modtext.trim()
    if (!desc) desc = args.htmldesc || '' // htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
    let spantext = mod + ' ' + desc
    let def = null

    if (!!match.groups.othermods) {
      def = parselink(match.groups.othermods.slice(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }

    let action = {
      orig: match.input,
      spantext: spantext,
      type: 'modifier',
      mod: mod,
      desc: desc,
      next: def?.action,
    }

    if (spantext.match(/\(([+-]A\:.+)\)/)) {
    }

    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods),
      action: action,
    }
  },
}

const _marginMod = {
  /**
   * Matches a Margin Modifier:
   *  • margin-modifier = sign "@margin" [ " " mod-description ]
   * Where:
   *  • sign = "+" | "-"
   *  • mod-description = ( text - "&" ) -- Any string that does not contain the '&' character.
   */
  regex: /^(?<sign>[+-])@margin *(?<modtext>[^&]*)(?<othermods>&.*)?/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    spantext: string,
   *    type: 'modifier',
   *    mod: string,
   *    desc: string,
   *    next?: Action
   *  }
   * }
   */
  parse: (match, args) => {
    let sign = match.groups.sign
    let mod = sign + '@margin'
    let desc = mod + ' ' + match.groups.modtext.trim()
    let spantext = desc
    let def = null

    if (!!match.groups.othermods) {
      def = parselink(match.groups.othermods.slice(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }
    let action = {
      orig: match.input,
      spantext: spantext,
      type: 'modifier',
      mod: mod,
      desc: desc.trim(),
      next: def?.action,
    }
    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods),
      action: action,
    }
  },
}

const _advLevelMod = {
  /**
    1. ^: Asserts the position at the start of the string.
    2. (?<sign>[+-]): A named capturing group `sign` that matches either a `+` or `-` character.
    3. [Aa]:: Matches either `A:` or `a:`.
    4. (?<modtext>"[^"]+"|'[^']+'|[^ &]+): A named capturing group `modtext` that matches one of the following:
      - "[^"]+": A double-quoted string (e.g., `"text"`).
      - '[^']+': A single-quoted string (e.g., `'text'`).
      - [^ &]+: One or more characters that are not a space or `&`.
    5.  +: Matches one or more space characters.
    6. (?<othermods>&.*)?: An optional named capturing group `othermods` that matches:
      - &.*: An ampersand followed by any character (except for a newline), zero or more times.

    Example Matches
    - +A:"multiword example" &mod
      - sign: +
      - modtext: "multiword example"
      - othermods: &mod
    - -a:'multiword example'
      - sign: -
      - modtext: 'multiword example'
      - othermods: undefined (since it's optional and not present)
    - A:example &mod
      - sign: undefined (since it's not present)
      - modtext: example
      - othermods: &mod
    */
  regex: /^(?<sign>[+-])(?<tag>[Aa]):(?<modtext>"[^"]+"|'[^']+'|[^ &]+) *(?<othermods>&.*)?/,

  /**
   * @param {*} match
   * @param {*} args
   * @returns {
   * text: string,
   * action: {
   *   orig: string,
   *   spantext: string,
   *   type: 'modifier',
   *   mod: string,
   *   desc: string,
   *   next?: Action
   *  }
   * }
   */
  parse: (match, args) => {
    let sign = match.groups.sign
    let modtext = match.groups.modtext.trim()
    let mod = `${sign}A:${modtext}`
    let temp = `${sign}${match.groups.tag}:${modtext}`
    let desc = match.input.replace(temp, '').trim()
    let spantext = `${mod} ${desc}`
    let action = {
      orig: match.input,
      spantext: spantext,
      type: 'modifier',
      mod: mod,
      desc: desc,
    }
    if (!args.overridetext) {
      args.overridetext = ''
    }
    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods),
      action: action,
    }
  },
}

const _iftest = {
  /**
   * Matches an IfTest:
   *  • iftest = keyword [ " " ] [ expression ]
   * Where:
   *  • keyword = "@margin" | "isCritSuccess" | "IsCritFailure"
   *  • sign = "+" | "-"
   *  • number = digit { digit }
   *  • comparison = "=" | "<" | ">" | "<=" | ">="
   *  • expression = comparison [ sign ] number
   */
  regex: /^@(?<keyword>margin|isCritSuccess|IsCritFailure) *(?<expression>(=|<|>|<=|>=) *[+-]?[\d\.]+)?$/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'iftest',
   *    name: string,
   *    equation: string
   *  }
   * }
   */
  parse: (match, _) => {
    let action = {
      type: 'iftest',
      orig: match.input,
      name: match.groups.keyword,
      equation: match.groups.expression,
    }
    return {
      text: match.input,
      action: action,
    }
  },
}

const _foundryLink = {
  /**
   * Matches a Foundry Link:
   *  • foundry-link = link "[" id "]" "{" [ text ] "}"
   * Where:
   *  • link = "JournalEntry" | "JournalEntryPage" | "Actor" | "RollTable" | "Item"
   *  • id-char = word | "."
   *  • id = id-char { id-char }
   *  • text = ( text - "}" ) -- Any string that does not contain the '}' character.
   */
  regex: /^(?<link>JournalEntry|JournalEntryPage|Actor|RollTable|Item)\[(?<id>[\.\w]+)\](?<overridetext>{.*})/,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'dragdrop',
   *    link: string,
   *    id: string
   *  }
   * }
   */
  parse: (match, args) => {
    let action = {
      type: 'dragdrop',
      orig: match.input,
      link: match.groups.link,
      id: match.groups.id,
    }
    return {
      text: gspan(match.groups.overridetext, match.input, action),
      action: action,
    }
  },
}

const _chat = {
  /**
   * Matches a Chat Command:
   *  • chat-command = "/" word [ " " text ]
   * Where:
   *  • word = ( text - " " ) -- Any string that does not contain the space character.
   */
  regex: /^\/(?<command>\S+)\s*(?<text>[\s\S]*)/,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'chat',
   *    quiet: boolean
   *  }
   * }
   */
  parse: (match, args) => {
    return {
      text: gspan(args.overridetxt, match.input, {
        type: 'chat',
        orig: match.input,
        quiet: args.blindroll,
      }),
      action: {
        type: 'chat',
        orig: match.input,
        quiet: args.blindroll,
      },
    }
  },
}

const _pdf = {
  /**
   * Matches a PDF Link:
   * • pdf-link = "PDF:" link
   *
   * Where:
   * • link = ( text - " " ) -- Any string that does not contain the space character.
   */
  regex: /^PDF: *(?<link>.*)/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'pdf',
   *    link: string
   *  }
   * }
   */
  parse: (match, args) => {
    return {
      text:
        "<span class='pdflink' data-pdf='" +
        match.groups.link +
        "'>" +
        (args.overridetxt || match.groups.link) +
        '</span>',
      action: {
        orig: match.input,
        type: 'pdf',
        link: match.groups.link,
      },
    }
  },
}

const _controlroll = {
  /**
   * Matches a Self Control Roll:
   *  • control-roll = "CR:" positive-integer [ " " text ]
   * Where:
   *  • positive-integer = digit { digit }
   */
  regex: /^CR: *(?<target>\d+) *(?<desc>.*)$/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'controlroll',
   *    target: number,
   *    desc: string
   *  }
   * }
   */
  parse: (match, args) => {
    let action = {
      orig: match.input,
      type: 'controlroll',
      target: parseInt(match.groups.target),
      desc: match.groups.desc,
      blindroll: args.blindroll,
      sourceId: args.sourceId,
    }
    return {
      text: gspan(args.overridetxt, match.input, action, blindrollText(args.blindroll)),
      action: action,
    }
  },
}

const _checkExists = {
  /**
   * Matches a Check Exists:
   * • check-exists = "?" type ":" text
   * Where:
   * • type = "A" | "AD" | "AT" | "M" | "R" | "S" | "Sk" | "Sp"
   */
  regex: /^\?(?<type>A|AD|AT|M|R|S|Sk|Sp?):(?<name>.+)/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'test-exists',
   *    prefix: string,
   *    name: string
   * }
   * }
   */
  parse: (match, args) => {
    let action = {
      orig: match.input,
      type: 'test-exists',
      prefix: match.groups.type,
      name: match.groups.name,
    }
    return {
      text: gspan(args.overridetxt, match.input, action),
      action: action,
    }
  },
}

const _attribute = {
  /**
   * Matches an Attribute OTF:
   *  • attribute-otf = ( target | attribute ) [ "|" text ]
   * Where:
   *  • target = attr-name positive-integer [ " " desc ] -- e.g., "ST12" or "IQ10 Comment"
   *  • attribute = attr-name [ ":" object ] [ " " mod ] [ " " desc ]
   *  • object = ":" alpha { alpha | " " | "*" } -- A string that starts with a letter, and contains only letters,
   *    spaces, and "*".
   *  • attr-name = alpha { alpha | " " } alpha -- A string that starts and ends with a letter, and contains only
   *    letters and spaces.
   *  • mod = [ "+" | "-" ] ( positive-integer | "@margin" | ("a:" advantage)) -- A modifier that can be a positive
   *    integer, "@margin", or "a:" followed by any text that does not contain a space.
   *  • advantage = ( text - " " ) | ("text") | ('text') -- Any string that does not contain the space character OR a
   *    string that is enclosed in single or double quotes.
   *  • desc = ( text - "|" ) -- Any string that does not contain the '|' character.
   */
  regex:
    /^(?<attrname>[A-Za-z][A-Za-z ]*[A-Za-z][0-9]*)(?<object>:[A-Za-z \*]+)? ?(?<mod>[+-](\d+|@margin|a:\S+|a:"[^"]*"|a:'[^']*'))? ?(?<desc>[^\|]*)(?<remainder>\|.*)?$/,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'attribute',
   *    attribute: string,
   *    attrkey: string,
   *    name: string,
   *    path: string,
   *    desc: string,
   *    mod: string,
   *    blindroll: boolean,
   *    next: Action,
   *    truetext: string,
   *    falsetext: string,
   *    target: string,
   *    melee: string,
   *    sourceId: string
   *  }
   * }
   */
  parse: (match, args) => {
    let attr = match.groups.attrname.trim()

    // Look for "targeted" attribute rolls, like ST12.
    var target
    let targetMatch = attr.match(/^(?<attrname>[a-zA-Z ]+)(?<target>\d+)/)
    if (!!targetMatch) {
      attr = targetMatch.groups.attrname
      target = targetMatch.groups.target // ST26
    }

    let attrkey = attr.toUpperCase()

    let path = PARSELINK_MAPPINGS[attrkey] // fright check has a space
    if (!path) {
      targetMatch = attr.split(' ') // but most others do not
      attr = targetMatch[0]
      targetMatch.shift()
      attrkey = attr.toUpperCase()
      path = PARSELINK_MAPPINGS[attrkey]
      match.groups.desc = targetMatch.join(' ')
    }

    if (!!path) {
      let opt =
        match.groups.desc.trim().match(/(?<attr>[^\?]*)(\? *"(?<truetext>[^"]*)")?( *[,:] *"(?<falsetext>[^"]*)")?/) ||
        [] // desc (searching for true/false options)
      let desc = opt.groups.attr.trim()
      let spantext = attr
      if (!!target) spantext += target

      let melee
      if (!!match.groups.object) {
        melee = match.groups.object.slice(1).trim()
        spantext += ':' + melee
      }

      if (!!match.groups.mod) {
        // If there is a +-mod, then the comment is the desc of the modifier
        spantext += ' ' + match.groups.mod + ' ' + desc
      } else {
        spantext += ' ' + desc
      }

      let def = null
      if (!!match.groups.remainder) {
        def = parselink(match.groups.remainder.slice(1).trim(), args.htmldesc, args.clrdmods)
        if (def?.action?.type == 'skill-spell' || def?.action?.type == 'attribute')
          spantext += ' | ' + def.action.spantext
        else def = {}
      }

      let action = {
        orig: match.input,
        spantext: spantext,
        type: 'attribute',
        attribute: attr,
        attrkey: attrkey,
        name: attrkey,
        path: path,
        desc: !!desc ? desc : undefined,
        mod: match.groups.mod,
        blindroll: args.blindroll,
        next: def?.action,
        truetext: opt.groups?.truetext,
        falsetext: opt.groups?.falsetext,
        target: target,
        melee: !!melee ? melee : undefined,
        sourceId: args.sourceId,
      }
      return {
        text: gspan(args.overridetxt, spantext, action, blindrollText(args.blindroll)),
        action: action,
      }
    }
  },
}

const _skillSpell = {
  /**
   * Matches a Skill or Spell OTF:
   * • skill-spell = type ":" name [ " " mod ] [ " " desc ] [ "|" text ]
   * Where:
   * • type = "S:" | "Sp:" | "Sk:"
   * • name = unquoted-name | quoted-name
   * • unquoted-name = ( text - " " ) -- Any string that does not contain the space character.
   * • quoted-name = '"' text '"' | "'" text "'" -- Any string that is enclosed in single or double quotes.
   * • mod = [ "+" | "-" ] (positive-integer | "@margin")
   * • desc = ( text - "|" ) -- Any string that does not contain the '|' character.
   */
  regex:
    /^(?<type>S:|Sp:|Sk:)(?<name>"[^"]+"|'[^']+'|(?<!["'])[^|]+?(?= ?[+-](\d+|@margin))|(?<!["'])[^ ]+) ?(?<mod>[+-](\d+|@margin))? ?(?<desc>[^\|]*)(?<remainder>\|.*)?$/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    blindroll: boolean,
   *    costs: string,
   *    desc?: string,
   *    falsetext: string,
   *    floatingAttribute: string,
   *    floatingLabel: string,
   *    floatingType: string,
   *    isSkillOnly: boolean,
   *    isSpellOnly: boolean,
   *    mod?: string,
   *    name: string,
   *    next: Action,
   *    orig: string,
   *    sourceId: string
   *    spantext: string,
   *    target: string,
   *    truetext: string,
   *    type: 'skill-spell',
   *  }
   * }
   */
  parse: (match, args) => {
    let name = stripQuotes(match.groups.name.trim())
    let modifierText = match.groups.mod?.trim()
    let moddesc = match.groups.desc?.trim() ?? ''
    const remainder = match.groups.remainder?.trim()

    let spantext = name // What we show in the highlighted span (yellow)
    let comment = moddesc

    // examine the description to see if this is a 'floating' skill
    let floatingAttribute
    let floatingLabel
    let floatingType
    let matches = comment.match(/(\((Based|Base|B): ?[^\)]+\))/gi)
    if (!!matches) {
      floatingLabel = comment.replace(/.*\((Based|Base|B): ?([^\)]+)\).*/gi, '$2')

      comment = comment
        .replace(/(\((Based|Base|B): ?[^\)]+\))/g, '')
        .replace('  ', ' ')
        .trim()

      // floatingAttribute must be an attribute
      let attribute = parselink(floatingLabel)
      if (attribute?.action?.type === 'attribute' || attribute?.action?.type === 'mapped') {
        floatingAttribute = attribute.action.path
        floatingType = attribute.action.type
      } else {
        floatingLabel = undefined
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

    // TODO If the comment doesn't match the pattern, this next line will fail.
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
    if (!!remainder) {
      def = parselink(remainder.slice(1).trim())
      if (def?.action?.type == 'skill-spell' || def?.action?.type == 'attribute')
        spantext += ' | ' + def.action.spantext
      else def = {}
    }
    let target = name.match(/(.*)=(\d+)/) // Targeted rolls 'Skill=12'
    let isSpell = !!match.groups.type.match(/^SP/i)
    let isSkill = !!match.groups.type.match(/^SK/i)
    let prefix = blindrollText(args.blindroll) + '<b>S:</b>'
    if (isSpell) prefix = blindrollText(args.blindroll) + '<b>Sp:</b>'
    if (isSkill) prefix = blindrollText(args.blindroll) + '<b>Sk:</b>'
    let action = {
      orig: args.str,
      type: 'skill-spell',
      isSpellOnly: isSpell,
      isSkillOnly: isSkill,
      name: !!target ? target[1] : name,
      target: !!target ? target[2] : undefined,
      mod: modifierText,
      desc: moddesc,
      blindroll: args.blindroll,
      next: def?.action,
      spantext: prefix + spantext,
      floatingAttribute: floatingAttribute,
      floatingType: floatingType,
      floatingLabel: floatingLabel,
      truetext: matches[3],
      falsetext: matches[5],
      costs: costs,
      sourceId: args.sourceId,
    }

    return {
      text: gspan(args.overridetxt, spantext, action, prefix),
      action: action,
    }
  },
}

const _attackDamage = {
  /**
   * Matches an Attack or Damage OTF:
   * • attack-damage = type ":" name [ " " mod ] [ " " desc ]
   * Where:
   * • type = "M:" | "R:" | "A:" | "D:" | "P:" | "B:"
   * • name = ( text - " " ) -- Any string that does not contain the space character.
   * • mod = [ "+" | "-" ] (positive-integer | "@margin")
   */
  regex: /^[MRADPB]:(?<name>"[^"]+"|'[^']+'|[^ "+-]+\*?) ?(?<modifier>[-+]\d+)? ?(?<desc>.*)/i,

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'attack' | 'attackdamage' | 'weapon-parry' | 'weapon-block',
   *    name: string,
   *    mod: string,
   *    desc: string,
   *    blindroll: boolean,
   *    costs: string,
   *    isMelee: boolean,
   *    isRanged: boolean,
   *    sourceId: string
   *  }
   * }
   */
  parse: (match, args) => {
    let name = stripQuotes(match.groups.name.trim())
    let comment = match.groups.desc
    let modifier = match.groups?.modifier

    let moddesc = ''
    let matches = comment.match(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/i)
    var costs
    if (!!matches) {
      costs = matches.input
      comment = comment
        .replace(/\* ?(Costs?|Per) (\d+) ?[\w\(\)]+/gi, '')
        .replace('  ', ' ')
        .trim()
    }
    matches = comment.match(/^\(.*\)$/) // Merge '(XXX)' into name
    if (!!matches) {
      name += ' ' + comment
      comment = ''
    }
    let spantext = name // What we show in the highlighted span (yellow)
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
    let isMelee = !!args.str.match(/^[AMDPB]/i)
    let isRanged = !!args.str.match(/^[ARD]/i)
    let type = 'attack'
    if (!!args.str.match(/^D/i)) type = 'attackdamage'
    if (!!args.str.match(/^P/i)) type = 'weapon-parry'
    if (!!args.str.match(/^B/i)) type = 'weapon-block'
    let action = {
      orig: match.input,
      type: type,
      name: name,
      mod: modifier,
      desc: moddesc,
      blindroll: args.blindroll,
      costs: costs,
      isMelee: isMelee,
      isRanged: isRanged,
      sourceId: args.sourceId,
    }
    return {
      text: gspan(
        args.overridetxt,
        spantext,
        action,
        blindrollText(args.blindroll) + '<b>' + match.input[0].toUpperCase() + ':</b>',
        comment
      ),
      action: action,
    }
  },
}

/**
 * README - To add new OTFs, create a new object with the following properties:
 * • regex: A regular expression that matches the OTF.
 * • parse: A function that takes the result of the regex match and returns an object with the following properties:
 *   • text: The HTML string to display in the chat.
 *   • action: An object with the data needed for the OTF action, or undefined. Returning undefined will cause the OTF
 *    to be processed by the remaining OTF parsers. If no parsers match, `{ text: <input> }` will be returned.
 */
const parseFunctions = [
  _modifier,
  _marginMod,
  _advLevelMod,
  _iftest,
  _foundryLink,
  _httpLink,
  _chat,
  _pdf,
  _controlroll,
  _checkExists,
  _skillSpell,
  _attribute,
  _attackDamage,
]

function blindrollText(blindroll) {
  return blindroll ? '(Blind Roll) ' : ''
}

function stripQuotes(name) {
  if (name[0] === '"' && name[name.length - 1] === '"') {
    name = name.slice(1, -1)
  } else if (name[0] === "'" && name[name.length - 1] === "'") {
    name = name.slice(1, -1)
  }
  return name
}

/**
 * @param {string} str
 * @param {string | null} [htmldesc]
 * @param {boolean} clrdmods
 * @returns {{text: string, action?: Action}}
 */
export function parselink(input, htmldesc, clrdmods = false) {
  let args = { str: sanitize(input), htmldesc: htmldesc, clrdmods: clrdmods }
  args.str = args.str.replace('–', '-').replace('\u2212', '-') // Allow display of long hyphen for minus

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
  if (!!dam) {
    dam.action.blindroll = args.blindroll
    dam.action.sourceId = args.sourceId
    return dam
  }

  for (const f of parseFunctions) {
    let matches, result
    if ((matches = args.str.match(f.regex))) {
      if ((result = f.parse(matches, args))) return result
    }
  }

  return { text: args.str }

  function setSourceId(args) {
    let m = args.str.match(/^@(?<actorid>[^@]+)@(?<text>[\s\S]*)/)
    if (m) {
      args.sourceId = m.groups.actorid
      args.str = m.groups.text.trim()
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
        extDamageType = undefined
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
      if (!dice) return undefined // if no damage type and no dice, not a roll, ex: [70]
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
  return undefined
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
    } else extDamageType = !!dmgTypeMatch[2].trim() ? dmgTypeMatch[2].trim() : undefined // 'ex' or 'inc' or more likely, undefined
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

  // If the action is an Advantage level modifier, then we need to create the action object to match the expected values.
  const advantageLevel = /\((?<mod>[+-]A:.+)\)/
  if (action.desc.match(advantageLevel)) {
    // expect(result.action).toEqual({
    //   orig: '+A:"Night Vision"',
    //   spantext: '+A:"Night Vision" ',
    //   type: 'modifier',
    //   mod: '+A:"Night Vision"',
    //   desc: '',
    // })
    // expect(result.text).toEqual(expect.stringContaining(`data-otf='+A:"Night Vision"'>+A:"Night Vision" </span>`))
    const m = action.desc.match(advantageLevel)
    action.orig = m.groups.mod
    action.spantext = action.orig
    action.mod = action.orig
    action.desc = ''
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
