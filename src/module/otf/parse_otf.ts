import { ParsedOtF, OptionalCheckParameters, OtFCostsAction } from "./base"
import { gmspan, sanitizeOtF } from "./utils"
import { parseOverrideText, parseBlindRoll, parseSourceId } from "./preparsers"
import {
	checkForChat,
	checkForHtml,
	checkForIf,
	checkForExists,
	checkForPDF,
	checkForFoundryDrops,
} from "./smaller_checks"
import { checkForSelfControl } from "./self_control"

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

export interface OtFChecker {
	(str: string, opt: OptionalCheckParameters): ParsedOtF | undefined
}
const checkFunctions: Array<OtFChecker> = []
// CheckFunctions.push(parseForRollOrDamage)   // This should be first!
checkFunctions.push(checkForModifier)
checkFunctions.push(checkForChat)
checkFunctions.push(checkForHtml)
checkFunctions.push(checkForIf)
checkFunctions.push(checkForExists)
checkFunctions.push(checkForPDF)
checkFunctions.push(checkForFoundryDrops)
checkFunctions.push(checkForSelfControl)

export function parselink(originalStr: string, htmldesc: string | null = "", clrdmods = false): ParsedOtF {
	const sanitizedStr = sanitizeOtF(originalStr)
	if (sanitizedStr.length < 2) return <ParsedOtF>{ text: sanitizedStr }

	const [postOverrideStr, overridetxt] = parseOverrideText(sanitizedStr)
	const [postBlindRollStr, blindroll, blindrollPrefix] = parseBlindRoll(postOverrideStr)
	const [finalStr, sourceId] = parseSourceId(postBlindRollStr)

	const opts = <OptionalCheckParameters>{
		blindroll: blindroll,
		sourceId: sourceId,
		htmldesc: htmldesc,
		overridetxt: overridetxt,
		clrmods: clrdmods,
		blindrollPrefix: blindrollPrefix,
	}

	for (let checkFunc of checkFunctions) {
		const result = checkFunc(finalStr, opts)
		if (result) return result
	}
	return <ParsedOtF>{ text: sanitizedStr }
}

export function checkForModifier(str: string, opts: OptionalCheckParameters): ParsedOtF | undefined {
	let m = str.match(/^(?<mod>[+-]\d+)(?<and>[^&]*)(?<remain>&.*)?/)
	if (m?.groups) {
		let mod = m.groups.mod
		let sign = mod[0]
		let desc = m.groups.and.trim()
		if (!desc) desc = opts.htmldesc || "" // Htmldesc is for things like ACC columns, or to hitlocations, where the mod's description is really the column name
		let spantext = `${mod} ${desc}`
		let remaining: ParsedOtF | undefined

		if (m.groups.remain) {
			remaining = parselink(m.groups.remain.substring(1).trim()) // Remove the leading &
			if (remaining.action?.type === "modifier") spantext += ` & ${remaining.action.spantext}`
		}

		let action: OtFCostsAction = {
			orig: str,
			spantext: spantext,
			type: "modifier",
			num: Number(mod),
			desc: desc,
			next: remaining?.action,
		}
		return <ParsedOtF>{
			text: gmspan(opts.overridetxt, spantext, action, sign === "+", opts.clrmods),
			action: action,
		}
	}
	m = str.match(/^(?<sign>[+-])@margin *(?<and>[^&]*)(?<remain>&.*)?/i)
	if (m?.groups) {
		let sign = m.groups.sign
		let mod = `${sign}@margin`
		let desc = `${mod} ${m.groups.and.trim()}`
		let spantext = desc
		let remaining: ParsedOtF | undefined

		if (m.groups.remain) {
			remaining = parselink(m.groups.remain.substring(1).trim()) // Remove the leading &
			if (remaining.action?.type === "modifier") spantext += ` & ${remaining.action.spantext}`
		}
		let action: OtFCostsAction = {
			orig: str,
			spantext: spantext,
			type: "modifier",
			margin: mod,
			desc: desc.trim(),
			next: remaining?.action,
		}
		return <ParsedOtF>{
			text: gmspan(opts.overridetxt, spantext, action, sign === "+", opts.clrmods),
			action: action,
		}
	}
	return undefined
}
