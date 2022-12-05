import { ParsedOtF, OtFCostsAction, OptionalCheckParameters } from "./base"
import { parselink } from "./parse_otf"
import { gmspan } from "./utils"

export function checkForModifier(str: string, opts: OptionalCheckParameters): ParsedOtF | undefined {
  let m = str.match(/^(?<mod>[\+-]\d+)(?<and>[^&]*)(?<remain>&.*)?/)
  if (m?.groups) {
    let mod = m.groups.mod
    let sign = mod[0]
    let desc = m.groups.and.trim()
    if (!desc) desc = opts.htmldesc || '' // htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
    let spantext = mod + ' ' + desc
    var remaining: ParsedOtF | undefined

    if (m.groups.remain) {
      remaining = parselink(m.groups.remain.substring(1).trim()) // remove the leading &
      if (remaining.action?.type == 'modifier') spantext += ' & ' + remaining.action.spantext
    }

    let action: OtFCostsAction = {
      orig: str,
      spantext: spantext,
      type: 'modifier',
      num: Number(mod),
      desc: desc,
      next: remaining?.action,
    }
    return <ParsedOtF> {
      text: gmspan(opts.overridetxt, spantext, action, sign == '+', opts.clrmods),
      action: action,
    }
  }
  m = str.match(/^(?<sign>[+-])@margin *(?<and>[^&]*)(?<remain>&.*)?/i)
  if (m?.groups) {
    let sign = m.groups.sign
    let mod = sign + '@margin'
    let desc = mod + ' ' + m.groups.and.trim()
    let spantext = desc
    var remaining: ParsedOtF | undefined

    if (m.groups.remain) {
        remaining = parselink(m.groups.remain.substring(1).trim()) // remove the leading &
      if (remaining.action?.type == 'modifier') spantext += ' & ' + remaining.action.spantext
    }
    let action: OtFCostsAction = {
      orig: str,
      spantext: spantext,
      type: 'modifier',
      margin: mod,
      desc: desc.trim(),
      next: remaining?.action,
    }
    return <ParsedOtF> {
      text: gmspan(opts.overridetxt, spantext, action, sign == '+', opts.clrmods),
      action: action,
    }
  }
  return undefined
}
