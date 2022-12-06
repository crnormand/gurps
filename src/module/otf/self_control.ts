import { ParsedOtF, OtFNumberedAction, OptionalCheckParameters } from "./base"
import { gspan } from "./utils"

// Self control roll CR: N
/**
 *
 * @param str
 * @param opts
 */
export function checkForSelfControl(str: string, opts: OptionalCheckParameters): ParsedOtF | undefined {
	let two = str.substring(0, 2)
	if (two === "CR" && str.length > 2 && str[2] === ":") {
		let rest = str.substring(3).trim()
		let num = rest.replace(/([0-9]+).*/g, "$1")
		let desc = rest.replace(/[0-9]+ *(.*)/g, "$1")
		let action = <OtFNumberedAction>{
			orig: str,
			type: "controlroll",
			num: parseInt(num),
			desc: desc,
			blindroll: opts.blindroll,
			sourceId: opts.sourceId,
		}
		return <ParsedOtF>{
			text: gspan(opts.overridetxt, str, action, opts.blindrollPrefix),
			action: action,
		}
	}
}
