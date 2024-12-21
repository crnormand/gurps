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

const parseFunctions = [
  { func: _parseModifier, regex: /^(?<signednum>[\+-]\d+)(?<modtext>[^&]*)(?<othermods>&.*)?/ },
  { func: _parseMarginMod, regex: /^(?<sign>[+-])@margin *(?<modtext>[^&]*)(?<othermods>&.*)?/i },
  {
    func: _parseIftest,
    regex: /^@(?<keyword>margin|isCritSuccess|IsCritFailure) *(?<expression>[=<>]+ *[+-]?[\d\.]+)?$/i,
  },
  {
    func: _parseFoundryLink,
    regex: /^(?<link>JournalEntry|JournalEntryPage|Actor|RollTable|Item)\[(?<id>[\.\w]+)\](?<overridetext>{.*})/,
  },
  // CR, PDF, Skill-Spell must come before Attribute.
  { func: _parseCR, regex: /^CR: *(?<target>\d+) *(?<desc>.*)$/i },
  { func: _parsePDF, regex: /^PDF: *(?<link>.*)/i },
  {
    func: _parseSkillSpell,
    regex: /^(?<type>S:|Sp:|Sk:)(?<name>"[^"]+"|'[^']+'|[^ ]+) ?(?<mod>[-+]\d+)? ?(?<desc>[^\|]*)(?<remainder>\|.*)?$/i,
  },
  {
    func: _parseAttribute,
    regex:
      /^(?<target>[A-Za-z ]+[0-9]*)(?<object>:[A-Za-z \*]+)? ?(?<mod>[+-]\d+)? ?(?<desc>[^\|]*)(?<remainder>\|.*)?$/,
  },
  { func: _parseChat, regex: /^\/(?<command>\w+) *(?<text>.*)/ },
]

function _parseModifier(match, args) {
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
  return {
    text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods),
    action: action,
  }
}

function _parseMarginMod(match, args) {
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
}

function _parseIftest(match, _) {
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
}

function _parseFoundryLink(match, _) {
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
}

function _parseChat(match, args) {
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
}

function _parseCR(match, args) {
  let action = {
    orig: match.input,
    type: 'controlroll',
    target: parseInt(match.groups.target),
    desc: match.groups.desc,
    blindroll: args.blindroll,
    sourceId: args.sourceId,
  }
  return {
    text: gspan(args.overridetxt, args.str, action, blindrollText(args.blindroll)),
    action: action,
  }
}

function _parsePDF(match, args) {
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
  } // Just get rid of the "[PDF:" and allow the pdflink css class to do most of the work
}

// Attributes "ST+2 desc, Per, Vision, etc." Also includes "Damage" and "Ranged" and "Melee" and "Block" and "Parry"...
// Used A-Za-zÀ-ž\u0370-\u03FF\u0400-\u04FF instead of \w to allow non-english mappings for attributes
// TODO Non-english mappings for attributes do not work!
function _parseAttribute(match, args) {
  let attr = match.groups.target.trim()
  var target
  let tmp = attr.match(/^([a-zA-Z ]+)(\d+)/)
  if (!!tmp) {
    attr = tmp[1]
    target = tmp[2] // ST26
  }
  let attrkey = attr.toUpperCase()

  let path = PARSELINK_MAPPINGS[attrkey] // fright check has a space
  if (!path) {
    tmp = attr.split(' ') // but most others do not
    attr = tmp[0]
    let t = attr.match(/^([a-zA-Z ]+)(\d+)/)
    if (!!t) {
      // I don't think you get reach this code.
      attr = tmp[1]
      target = tmp[2]
    }
    tmp.shift()
    attrkey = attr.toUpperCase()
    path = PARSELINK_MAPPINGS[attrkey]
    match.groups.desc = tmp.join(' ')
  }
  if (!!path) {
    // TODO Understand this -- what options does this provide?
    let opt =
      match.groups.desc.trim().match(/(?<attr>[^\?]*)(\? *"(?<truetext>[^"]*)")?( *[,:] *"(?<falsetext>[^"]*)")?/) || [] // desc (searching for true/false options)
    let desc = opt.groups.attr.trim()
    let spantext = attr
    if (!!target) spantext += target
    let melee = ''
    if (!!match.groups.object) {
      melee = match.groups.object.slice(1).trim()
      spantext += ':' + melee
    }
    let modifier = match.groups.mod
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
      desc: desc,
      mod: modifier,
      blindroll: args.blindroll,
      next: def?.action,
      truetext: opt.groups?.truetext,
      falsetext: opt.groups?.falsetext,
      target: target,
      melee: melee,
      sourceId: args.sourceId,
    }
    return {
      text: gspan(args.overridetxt, spantext, action, blindrollText(args.blindroll)),
      action: action,
    }
  }
}

function _parseSkillSpell(match, args) {
  let name = match.groups.name.trim()
  // strip off leading/trailing quotes
  if (name[0] === '"' && name[name.length - 1] === '"') {
    name = name.slice(1, -1)
  } else if (name[0] === "'" && name[name.length - 1] === "'") {
    name = name.slice(1, -1)
  }
  let modifierText = match.groups.mod?.trim()
  let moddesc = match.groups.desc?.trim()
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
    if (attribute.action?.type === 'attribute' || attribute.action?.type === 'mapped') {
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
    if (def?.action?.type == 'skill-spell' || def?.action?.type == 'attribute') spantext += ' | ' + def.action.spantext
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
}

function blindrollText(blindroll) {
  return blindroll ? '(Blind Roll) ' : ''
}

/**
 * Documenting input using something like EBNF:
 *   • sign = "+" | "-"
 *   • word = (text - " ") ** Any string of characters that does not contain the space character.**
 *   • positive-integer = digit { digit }
 *
 * Valid OTF format for every action type. This must procede rest of the OTF.
 *
 *  • overridetext = [ "'" text "'" | '"' text '"' | "" ]
 *  • blindroll = "!"
 *  • actor-id = "@" word "@"
 *
 * Action type = Damage:
 *  •
 *
 * Action type = Modifier:
 *  A list of modifiers, separated by &. Each modifier has the following format:
 *
 *   • mod-value = positive-integer | "@margin"
 *   • mod-description = ( text - "&" ) ** Any string of characters that does not contain the '&' character. **
 *   • modifier = sign mod-value [ " " mod-description ]
 *
 **   modifier-otf = modifier { [ " " ] "&" [ " " ] modifier }
 *
 * Action type = Chat:
 *  The '/' character, followed by the chat command, and any text to be sent to the chat processor:
 *
 **   chat = "/" word [ " " text ]
 *
 * Action type = IfTest:
 *
 *  • iftest-key = "@margin" | "isCritSuccess" | "IsCritFailure"
 *  • comparison = "=" | "<" | ">" | "<=" | ">="
 *
 ** iftest = iftest-key " " [ comparison [sign] number ]
 *
 *  TODO: Why is there a '\.' in the regex?  It doesn't seem to be used.
 *  TODO: How is the expression used on "isCritSuccess" and "isCritFailure"?
 *
 * Action type = DragDrop:
 *
 *  • link = "JournalEntry" | "JournalEntryPage" | "Actor" | "RollTable" | "Item"
 *  • id-char = word | "."
 *  • id = id-char { id-char }
 *
 **  dragdrop = link "[" id "]" "{" ( text | "" ) "}"
 *
 * Action type = Attribute:
 *  • Alphabetic characters - attribute, required (may contain a space: "Fright Check" for example). Must match a (English) attribute name.
 *  • <integer> - target, optional -- if present, the attribute is a targetted roll against the number: "ST12" -- roll ST vs 12. No optional description or modifiers allowed.
 *    TODO: I don't really know what a targetted roll against an attribute is used for: "ST12"? this should ignore the attribute and just be a roll vs 12.
 *  • [+ or -]<integer> - modifier, optional.
 *  • [^\|]* - description, optional (any character except |)
 *
 *  Other Attribute options:
 *   • Atrtribute/Skill Tree:  Attribute-Check | Attribute-Check | Skill-Spell Check... Evaluates each and returns the highest check value (best skill|attribute).
 *   • Conditional:  Attribute-Check ? "Success" : "Failure"
 *
 * Action type = Self Control Roll:
 *  • CR: <integer> - keyword, required
 *  • <integer> - target, required
 *  • [^\|]* - description, optional (any character except |)
 *
 * Action type = PDF:
 *  • PDF: - keyword, required
 *  • <string> - link, required
 *
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

  //  Support the format @actorid@ to indicate the actor that created this OTF.
  // 	Most notably, it allows a GM to attack and create damage where the damage chat
  // 	shows the originator of the damage, not the currently selected LastActor.
  // 	(a common problem for GMs that manage a lot of NPCs)
  // E.g.,   @actorid@ 2d-1 cut, @actorid@ IQ-4, etc.
  setSourceId(args)

  let dam = parseForRollOrDamage(args.str, args.overridetxt)
  if (!!dam) {
    dam.action.blindroll = args.blindroll
    dam.action.sourceId = args.sourceId
    return dam
  }

  for (const f of parseFunctions) {
    let matches
    if ((matches = args.str.match(f.regex))) return f.func(matches, args)
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
  let parse = args.str.replace(/^S[pkPK]?:"([^"]+)" ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
  if (parse === args.str) {
    parse = args.str.replace(/^S[pkPK]?:'([^']+)' ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
    // Use quotes to capture skill/spell name (with as many * as they want to embed)
    // if (parse == args.str) parse = args.str.replace(/^S[pkPK]?:([^\| \?\(+-]+\*?) ?([-+]\d+)? ?([^\|]*)(\|.*)?/gi, '$1~$2~$3~$4')
    if (parse === args.str)
      parse = args.str.replace(
        /^S[pkPK]?:([^\| \?\(\+\-]+(?:-[^\| \?\(\+\-]+)?) ?([+-]\d+)? ?([^\|]*)(\|.*)?/gi,
        '$1~$2~$3~$4'
      )
  }

  if (parse !== args.str) {
    let a = parse.split('~')

    if (!!a[0].trim()) {
      const name = a[0].trim() // semi-regex pattern of skill/spell name (minus quotes)
      let modifierText = a[1].trim()
      let moddesc = a[2].trim()
      const remainder = a[3].trim()

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
        if (attribute.action?.type === 'attribute' || attribute.action?.type === 'mapped') {
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
        if (def.action?.type == 'skill-spell' || def.action?.type == 'attribute')
          spantext += ' | ' + def.action.spantext
        else def = {}
      }
      let target = name.match(/(.*)=(\d+)/) // Targeted rolls 'Skill=12'
      let isSpell = !!args.str.match(/^SP/i)
      let isSkill = !!args.str.match(/^SK/i)
      let prefix = blindrollText(blindroll) + '<b>S:</b>'
      if (isSpell) prefix = blindrollText(blindroll) + '<b>Sp:</b>'
      if (isSkill) prefix = blindrollText(blindroll) + '<b>Sk:</b>'
      let action = {
        orig: args.str,
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
        text: gspan(args.overridetxt, spantext, action, prefix),
        action: action,
      }
    }
  }

  // Use quotes to capture item name (with optional *s), first try double quotes, then single quotes, then
  // Simple, no-spaces, no quotes melee/ranged name (with optional *s)
  // Melee, Ranged, Attack, Damage, Block, Parry
  parse = args.str.replace(/^[MRADPB]:"([^"]+)" ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')
  if (parse == args.str) parse = args.str.replace(/^[MRADPB]:'([^']+)' ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')
  if (parse == args.str) parse = args.str.replace(/^[MRADPB]:([^ "+-]+\*?) ?([-+]\d+)? ?(.*)/gi, '$1~$2~$3')

  if (parse != args.str) {
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
      let isMelee = !!args.str.match(/^[AMDPB]/i)
      let isRanged = !!args.str.match(/^[ARD]/i)
      let type = 'attack'
      if (!!args.str.match(/^D/i)) type = 'attackdamage'
      if (!!args.str.match(/^P/i)) type = 'weapon-parry'
      if (!!args.str.match(/^B/i)) type = 'weapon-block'
      let action = {
        orig: args.str,
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
        text: gspan(
          args.overridetxt,
          spantext,
          action,
          blindrollText(blindroll) + '<b>' + args.str[0].toUpperCase() + ':</b>',
          comment
        ),
        action: action,
      }
    }
  }

  let m = args.str.match(/^\?([AMRS][TDPK]?):(.*)/i)
  if (!!m) {
    let name = m[2]
    let quotes = name.match(/^['"](.*)['"]/)
    if (!!quotes) name = quotes[1]
    let action = {
      orig: args.str,
      type: 'test-exists',
      prefix: m[1].toUpperCase(),
      name: name,
    }
    return {
      text: gspan(args.overridetxt, args.str, action),
      action: action,
    }
  }

  m = args.str.match(/https?:\/\//i)
  if (!!m) {
    let lbl = !!args.overridetxt ? args.overridetxt : args.str
    let action = {
      orig: args.str,
      label: lbl,
      type: 'href',
    }
    return { action: action, text: `<a href="${args.str}">${lbl}</a>` }
  }

  return { text: args.str }

  function setSourceId(args) {
    let m = args.str.match(/^@(?<actorid>[^@]+)@(?<text>.*)/)
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
    let match = args.str.match(/^"(?<overridetext>[^"]*)"(?<text>.*)/)
    if (match) {
      args.overridetxt = match.groups?.overridetext
      args.str = match.groups?.text.trim()
    } else {
      match = args.str.match(/^'(?<overridetext>[^']*)'(?<text>.*)/)
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
