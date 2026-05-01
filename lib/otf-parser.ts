import { DeepPartial } from 'fvtt-types/utils'
import { parselink, PARSELINK_MAPPINGS } from './parselink.js'
import { utoa } from './utilities.js'
import { stripQuotes } from '../module/utilities/text-utils.js'
import { Action, OtfActionType, ParserResult } from '../module/otf/types.js'

type InputArgs = {
  str: string
  htmldesc?: string | null
  clrdmods?: boolean
  overridetxt?: string
  blindroll?: boolean
  sourceId?: string
}

class OtfParser {
  regex: RegExp | undefined

  parse_(input: InputArgs): ParserResult | null {
    if (this.regex && this.regex.test(input.str)) {
      let match = input.str.match(this.regex)
      return this.parse(match!, input)
    }
    return null
  }

  parse(match: RegExpMatchArray, input: InputArgs): ParserResult | null {
    return null
  }
}

// Matches any string that starts with "http://"" or "https://".
class HttpLinkParser extends OtfParser {
  override regex = /^https?:\/\/.*/i

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
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult {
    let action = {
      orig: match.input,
      type: OtfActionType.href,
      label: !!args.overridetxt ? args.overridetxt : match.input,
    }
    return {
      text: `<a href="${match.input}">${args.overridetxt || match.input}</a>`,
      action: action,
    }
  }
}

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
class ModifierParser extends OtfParser {
  override regex = /^(?<signednum>[\+-]\d+)(?<modtext>[^&]*)(?<othermods>&.*)?/

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
     }
     */
  override parse(match: RegExpMatchArray, args: InputArgs): any | null {
    let mod = match.groups?.signednum
    let sign = mod![0]
    let desc = match.groups?.modtext.trim()
    if (!desc) desc = args.htmldesc || '' // htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
    let spantext = mod + ' ' + desc
    let def = null

    if (!!match.groups?.othermods) {
      def = parselink(match.groups.othermods.slice(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }

    let action = {
      orig: match.input,
      spantext: spantext,
      type: OtfActionType.modifier,
      mod: mod,
      desc: desc,
      next: def?.action,
    }

    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods ?? false),
      action: action,
    }
  }
}

/**
 * Matches a Margin Modifier:
 *  • margin-modifier = sign "@margin" [ " " mod-description ]
 * Where:
 *  • sign = "+" | "-"
 *  • mod-description = ( text - "&" ) -- Any string that does not contain the '&' character.
 */
class MarginModParser extends OtfParser {
  override regex = /^(?<sign>[+-])@margin *(?<modtext>[^&]*)(?<othermods>&.*)?/i

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
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let sign = match.groups!.sign
    let mod = sign + '@margin'
    let desc = mod + ' ' + match.groups!.modtext.trim()
    let spantext = desc
    let def = null

    if (!!match.groups!.othermods) {
      def = parselink(match.groups!.othermods.slice(1).trim()) // remove the leading &
      if (def.action?.type == 'modifier') spantext += ' & ' + def.action.spantext
      else def = {}
    }
    let action = {
      orig: match.input,
      spantext: spantext,
      type: OtfActionType.modifier,
      mod: mod,
      desc: desc.trim(),
      next: def?.action,
    }
    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods ?? false),
      action: action,
    }
  }
}

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
class AdvLevelModParser extends OtfParser {
  override regex = /^(?<sign>[+-])(?<tag>[Aa]):(?<modtext>"[^"]+"|'[^']+'|[^ &]+) *(?<othermods>&.*)?/

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
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let sign = match.groups!.sign
    let modtext = match.groups!.modtext.trim()
    let mod = `${sign}A:${modtext}`
    let temp = `${sign}${match.groups!.tag}:${modtext}`
    let desc = match.input!.replace(temp, '').trim()
    let spantext = `${mod} ${desc}`
    let action = {
      orig: match.input,
      spantext: spantext,
      type: OtfActionType.modifier,
      mod: mod,
      desc: desc,
    }
    if (!args.overridetxt) {
      args.overridetxt = ''
    }
    return {
      text: gmspan(args.overridetxt, spantext, action, sign == '+', args.clrdmods ?? false),
      action: action,
    }
  }
}

class IfTestParser extends OtfParser {
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
  override regex = /^@(?<keyword>margin|isCritSuccess|IsCritFailure) *(?<expression>(=|<|>|<=|>=) *[+-]?[\d\.]+)?$/i

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
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let action = {
      type: OtfActionType.iftest,
      orig: match.input,
      name: match.groups!.keyword,
      equation: match.groups!.expression,
    }
    return {
      text: args.str,
      action: action,
    }
  }
}

/**
 * Matches a Foundry Link:
 *  • foundry-link = link "[" id "]" "{" [ text ] "}"
 * Where:
 *  • link = "JournalEntry" | "JournalEntryPage" | "Actor" | "RollTable" | "Item"
 *  • id-char = word | "."
 *  • id = id-char { id-char }
 *  • text = ( text - "}" ) -- Any string that does not contain the '}' character.
 */
class FoundryLinkParser extends OtfParser {
  override regex = /^(?<link>JournalEntry|JournalEntryPage|Actor|RollTable|Item)\[(?<id>[\.\w]+)\](?<overridetext>{.*})/

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
  override parse = (match: RegExpMatchArray, _: InputArgs): ParserResult | null => {
    let action = {
      type: OtfActionType.dragdrop,
      orig: match.input,
      link: match.groups!.link,
      id: match.groups!.id,
    }
    return {
      text: gspan(match.groups!.overridetext, match.input!, action),
      action: action,
    }
  }
}

/**
 * Matches a Chat Command:
 *  • chat-command = "/" word [ " " text ]
 * Where:
 *  • word = ( text - " " ) -- Any string that does not contain the space character.
 */
class ChatParser extends OtfParser {
  override regex = /^\/(?<command>\S+)\s*(?<text>[\s\S]*)/

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
  override parse = (match: RegExpMatchArray, args: InputArgs): ParserResult | null => {
    return {
      text: gspan(args.overridetxt, match.input!, {
        type: OtfActionType.chat,
        orig: match.input,
        quiet: args.blindroll,
      }),
      action: {
        type: OtfActionType.chat,
        orig: match.input,
        quiet: args.blindroll,
      },
    }
  }
}

/**
 * Matches a PDF Link:
 * • pdf-link = "PDF:" link
 *
 * Where:
 * • link = ( text - " " ) -- Any string that does not contain the space character.
 */
class PdfParser extends OtfParser {
  override regex = /^PDF: *(?<link>.*)/i

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
  override parse = (match: RegExpMatchArray, args: InputArgs): ParserResult | null => {
    return {
      text:
        "<span class='pdflink' data-pdf='" +
        match.groups!.link +
        "'>" +
        (args.overridetxt || match.groups!.link) +
        '</span>',
      action: {
        orig: match.input,
        type: OtfActionType.pdf,
        link: match.groups!.link,
      },
    }
  }
}

/**
 * Matches a Self Control Roll:
 *  • control-roll = "CR:" positive-integer [ " " text ]
 * Where:
 *  • positive-integer = digit { digit }
 */
class ControlRollParser extends OtfParser {
  override regex = /^CR: *(?<target>\d+) *(?<desc>.*)$/i

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
  override parse = (match: RegExpMatchArray, args: InputArgs): ParserResult | null => {
    let action = {
      orig: match.input,
      type: OtfActionType.controlroll,
      target: parseInt(match.groups!.target),
      desc: match.groups!.desc,
      blindroll: args.blindroll,
      sourceId: args.sourceId,
    }
    return {
      text: gspan(args.overridetxt, match.input!, action, blindrollText(args.blindroll ?? false)),
      action: action,
    }
  }
}

/**
 * Matches a Check Exists:
 * • check-exists = "?" type ":" text
 * Where:
 * • type = "A" | "AD" | "AT" | "M" | "R" | "S" | "Sk" | "Sp"
 */
class CheckExistsParser extends OtfParser {
  override regex = /^\?(?<type>A|AD|AT|M|R|S|Sk|Sp?):(?<name>.+)/i

  /**
   * @returns {
   *  text: string,
   *  action: {
   *    orig: string,
   *    type: 'test-exists',
   *    prefix: string,
   *    name: string
   *  }
   * }
   */
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let action = {
      orig: match.input,
      type: OtfActionType.testexists,
      prefix: match.groups!.type,
      name: match.groups!.name,
    }
    return {
      text: gspan(args.overridetxt, match.input!, action),
      action: action,
    }
  }
}

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
class AttributeParser extends OtfParser {
  override regex =
    /^(?<attrname>[A-Za-z][A-Za-z ]*[A-Za-z][0-9]*)(?<object>:[A-Za-z \*]+)? ?(?<mod>[+-](\d+|@margin|a:\S+|a:"[^"]*"|a:'[^']*'))? ?(?<desc>[^\|]*)(?<remainder>\|.*)?$/

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
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let attr = match.groups!.attrname.trim()

    // Look for "targeted" attribute rolls, like ST12.
    var target
    let targetMatch = attr.match(/^(?<attrname>[a-zA-Z ]+)(?<target>\d+)/)
    if (!!targetMatch) {
      attr = targetMatch.groups!.attrname
      target = targetMatch.groups!.target // ST26
    }

    let attrkey = attr.toUpperCase()

    let path: string | undefined = resolveAttributePath(attrkey) // fright check has a space
    if (!path) {
      let targetMatch = attr.split(' ') // but most others do not
      attr = targetMatch[0]
      targetMatch.shift()
      attrkey = attr.toUpperCase()
      path = resolveAttributePath(attrkey)
      match.groups!.desc = targetMatch.join(' ')
    }

    if (!path) return null

    // desc (searching for true/false options)
    let opt = match
      .groups!.desc.trim()
      .match(/(?<attr>[^\?]*)(\? *"(?<truetext>[^"]*)")?( *[,:] *"(?<falsetext>[^"]*)")?/)

    let desc = opt ? opt.groups!.attr.trim() : ''
    let spantext = attr.trim()
    if (!!target) spantext += target.trim()

    let melee
    if (!!match.groups!.object) {
      melee = match.groups!.object.slice(1).trim()
      spantext += ':' + melee
    }

    if (!!match.groups!.mod) {
      // If there is a +-mod, then the comment is the desc of the modifier
      spantext += ' ' + match.groups!.mod + ' ' + desc
    } else {
      spantext += ' ' + desc
    }

    spantext = spantext.trim()

    let def = null
    if (!!match.groups!.remainder) {
      def = parselink(match.groups!.remainder.slice(1).trim(), args.htmldesc, args.clrdmods)
      if (def?.action?.type == 'skill-spell' || def?.action?.type == 'attribute')
        spantext += ' | ' + def.action.spantext
      else def = {}
    }

    let action = {
      orig: match.input,
      spantext: spantext.trim(),
      type: OtfActionType.attribute,
      attribute: attr,
      attrkey: attrkey,
      name: attrkey,
      path: path,
      desc: !!desc ? desc : undefined,
      mod: match.groups!.mod,
      blindroll: args.blindroll,
      next: def?.action,
      truetext: opt?.groups?.truetext,
      falsetext: opt?.groups?.falsetext,
      target: target,
      melee: !!melee ? melee : undefined,
      sourceId: args.sourceId,
    }
    return {
      text: gspan(args.overridetxt, spantext, action, blindrollText(args.blindroll ?? false)),
      action: action,
    }
  }
}

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
class SkillSpellParser extends OtfParser {
  // if it starts with "S:", "Sp:", or "Sk:", parse it as if it is a skill or spell.
  override regex = /^(S:|Sp:|Sk:)/i

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
   *    falsetext: string,
   *    type: 'skill-spell',
   *  }
   * }
   */
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    const input = args.str
    const result = this.parseSkill(input)
    if (result) {
      result.blindroll = args.blindroll ?? false
      result.orig = args.str

      let prefix = blindrollText(args.blindroll ?? false) + '<b>S:</b>'
      if (result.isSpellOnly) prefix = blindrollText(args.blindroll ?? false) + '<b>Sp:</b>'
      if (result.isSkillOnly) prefix = blindrollText(args.blindroll ?? false) + '<b>Sk:</b>'
      const spantext = result.spantext
      result.spantext = prefix + spantext

      return {
        text: gspan(args.overridetxt, spantext!, result, prefix),
        action: result,
      }
    }
    return {
      text: gspan(args.overridetxt, '', {}, ''),
      action: {},
    }
  }

  parseSkill(input: string): DeepPartial<Action> | null {
    if (!input) return null

    const result: DeepPartial<Action> = {}

    // 1. Split phrases
    const first = input.split('|')[0].trim()

    let remainder = input.replace(first, '').trim()
    if (remainder.startsWith('|')) {
      remainder = remainder.slice(1).trim()
    }

    let i = 0

    // Increment i until it indexes the first non-whitespace character.
    function skipWS() {
      while (i < first.length && /\s/.test(first[i])) i++
    }

    // Apply the regexp to first and return the matches, but only if the match starts at index i. If it matches,
    // increment i to the end of the match. This allows us to apply regexps sequentially to the string.
    function match(re: RegExp): RegExpExecArray | null {
      const m = re.exec(first.slice(i))
      if (!m || m.index !== 0) return null
      i += m[0].length
      return m
    }

    // 2. TYPE
    let matches = match(/^(s|sk|sp)\s*:/i)
    if (!matches) return result
    result.type = OtfActionType.skillSpell
    result.isSpellOnly = !!matches[1].match(/^SP/i)
    result.isSkillOnly = !!matches[1].match(/^SK/i)

    skipWS()

    // 3. NAME
    matches = match(/^("[^"]+"|'[^']+'|[^ ]+?)(?=[+-](\d+\s|\d+$|@margin)|\s|$)/)
    if (!matches) return result
    result.name = stripQuotes(matches[1]).trim()

    skipWS()

    // 4. MODIFIER
    matches = match(/^([+-](?:\d+|@margin))/i)
    if (matches) {
      result.mod = matches[1]
      skipWS()
    }

    // 5. BASED
    matches = match(/^\(Based:\s*([^)]+)\)/i)
    if (matches) {
      result.floatingLabel = matches[1].trim()
      let attribute = parselink(result.floatingLabel)
      if (attribute?.action?.type === OtfActionType.attribute) {
        result.floatingAttribute = attribute.action.path
        result.floatingType = attribute.action.type
      } else {
        result.floatingLabel = undefined
      }
      skipWS()
    }

    // 6. COSTS
    matches = match(/^\*\s*(?:per|costs)\s*(\d+.*)/i)
    if (matches) {
      result.costs = '*Per ' + matches[1].trim()
      skipWS()
    }

    // 7. DESCRIPTION = rest
    result.desc = first.slice(i).trim()

    // 8. IF text
    // If result.desc matches a patern like "<text> ? "true text" : "false text"", then we want to extract the true and
    // false text, and remove it from the description. Each true and false text may be a single word or quoted.
    const ifmatch = result.desc.match(/(?<desc>[^\?]*)(\? *"(?<truetext>[^"]*)")?( *[,:] *"(?<falsetext>[^"]*)")?/)
    if (ifmatch) {
      result.desc = ifmatch.groups!.desc.trim()
      result.truetext = ifmatch.groups!.truetext
      result.falsetext = ifmatch.groups!.falsetext
    }

    if (remainder) {
      let def = parselink(remainder.trim())
      // if (def?.action?.type == 'skill-spell' || def?.action?.type == 'attribute')
      //   spantext += ' | ' + def.action.spantext
      result.next = def?.action
    }

    // 9. spantext
    // Span text is result.name + (result.mod ? ' ' + result.mod : '') + (result.desc ? ' ' + result.desc : '') + the spantext of result.next, separated by '|'
    result.spantext =
      result.name +
      (result.mod ? ' ' + result.mod : '') +
      (result.desc ? ' ' + result.desc : '') +
      (result.floatingLabel ? ' (Based:' + result.floatingLabel + ')' : '') +
      (result.costs ? ' ' + result.costs : '') +
      (result.next ? ' | ' + result.next.spantext : '')

    return result
  }
}

/**
 * Matches an Attack or Damage OTF:
 * • attack-damage = type ":" name [ " " mod ] [ " " desc ]
 * Where:
 * • type = "M:" | "R:" | "A:" | "D:" | "P:" | "B:"
 * • name = ( text - " " ) -- Any string that does not contain the space character.
 * • mod = [ "+" | "-" ] (positive-integer | "@margin")
 */
class AttackDamageParser extends OtfParser {
  override regex = /^[MRADPB]:(?<name>"[^"]+"|'[^']+'|[^ "+-]+\*?) ?(?<modifier>[-+]\d+)? ?(?<desc>.*)/i

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
   * }
   */
  override parse(match: RegExpMatchArray, args: InputArgs): ParserResult | null {
    let name = stripQuotes(match.groups!.name.trim())
    let comment = match.groups!.desc
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
    let type: OtfActionType = OtfActionType.attack
    if (!!args.str.match(/^D/i)) type = OtfActionType.attackdamage
    if (!!args.str.match(/^P/i)) type = OtfActionType.weaponParry
    if (!!args.str.match(/^B/i)) type = OtfActionType.weaponBlock
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
        blindrollText(args.blindroll ?? false) + '<b>' + match.input![0].toUpperCase() + ':</b>',
        comment
      ),
      action: action,
    }
  }
}

/**
 * One day enhance this to find custom attributes.
 */
function resolveAttributePath(attrkey: string): string | undefined {
  return PARSELINK_MAPPINGS[attrkey as keyof typeof PARSELINK_MAPPINGS]
}

/**
 * @param {string | undefined} overridetxt
 * @param {string} str
 * @param {Action} action
 * @param {boolean} plus
 * @param {boolean} clrdmods
 */
export function gmspan(
  overridetxt: string | undefined,
  str: string,
  action: DeepPartial<Action>,
  plus: boolean,
  clrdmods: boolean
) {
  if (!!overridetxt) {
    str = overridetxt
    action.overridetxt = overridetxt
  }

  // If the action is an Advantage level modifier, then we need to create the action object to match the expected values.
  const advantageLevel = /\((?<mod>[+-]A:.+)\)/
  if (action.desc!.match(advantageLevel)) {
    const m = action.desc!.match(advantageLevel)
    action.orig = m?.groups?.mod ?? ''
    action.spantext = action.orig
    action.mod = action.orig
    action.desc = ''
  }

  let a = !!action
    ? " data-action='" +
      utoa(JSON.stringify(action)) +
      "' data-otf='" +
      (action.blindroll ? '!' : '') +
      action.orig +
      "'"
    : ''
  if (action.type === OtfActionType.modifier) {
    if (str.startsWith('-')) str = '&minus;' + str.slice(1) // \u2212
  }
  let s = `<span class='gga-app glinkmod'${a}>${str}`
  if (clrdmods) {
    if (plus) s = `<span class='gga-app glinkmodplus'${a}>${str}`
    else s = `<span class='gga-app glinkmodminus'${a}>${str}`
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
export function gspan(
  overridetxt: string | undefined,
  str: string,
  action: DeepPartial<Action>,
  prefix?: string,
  comment?: string
) {
  if (!!overridetxt) {
    str = overridetxt
    prefix = ''
    comment = ''
    action.overridetxt = overridetxt
  }
  let s = "<span class='gga-app gurpslink'"
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

function blindrollText(blindroll: boolean) {
  return blindroll ? '(Blind Roll) ' : ''
}

export const PARSERS = [
  new HttpLinkParser(),
  new ModifierParser(),
  new MarginModParser(),
  new AdvLevelModParser(),
  new IfTestParser(),
  new FoundryLinkParser(),
  new ChatParser(),
  new PdfParser(),
  new ControlRollParser(),
  new CheckExistsParser(),
  new SkillSpellParser(),
  new AttributeParser(),
  new AttackDamageParser(),
]
