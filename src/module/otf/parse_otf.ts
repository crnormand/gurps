import { ParsedOtF, OptionalCheckParameters } from "./base"
import { sanitizeOtF } from "./utils"
import { parseOverrideText, parseBlindRoll, parseSourceId } from "./preparsers"
// Import { parseForRollOrDamage } from "./parse_damage"
import { checkForModifier } from "./check_modifier"
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

/**
 * @param originalStr
 * @param {string | null} [htmldesc]
 * @param {boolean} clrdmods
 * @returns {{text: string, action?: OtFAction}}
 */
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
