import { OtFAction } from "./base"

/**
 *
 * @param str
 */
export function sanitizeOtF(str: string): string {
	str = str.replace(/%(?![0-9][0-9a-fA-F]+)/g, "%25")
	str = decodeURIComponent(str) // Convert % (not followed by 2 digit hex) to %25, unicode characters into html format
	str = str.replace(/&nbsp;/g, " ") // We need to convert non-breaking spaces into regular spaces for parsing
	str = str.replace(/&amp;/g, "&") // We need to convert to & for easier parsing
	str = str.replace(/&minus;/g, "-") // We need to convert to - for easier parsing
	str = str.replace(/&plus;/g, "+") // We need to convert to - for easier parsing
	str = str.replace(/(&#215;|&#xD7;|&times)/g, "x") // We need to convert the multiplication symbol to x for easier parsing
	str = str.replace(/(<([^>]+)>)/gi, "") // Remove <html> tags
	str = str.replace(/(\u201c|\u201d)/g, '"') // Double quotes
	str = str.replace(/&quot;/g, '"') // Double quotes
	// str = str.replace(/(\u2018|\u2019)/g, "'") // single quotes
	str = str.replace(/\u2011/g, "-") // Replace non-breaking hyphon with a minus sign
	str = str.replace("–", "-").replace("\u2212", "-") // Allow display of long hyphen for minus
	return str
}

/**
 * ASCII to Unicode (decode Base64 to original data)
 * @param {string} b64
 * @returns {string}
 */
export function atou(b64: string): string {
	return decodeURIComponent(escape(atob(b64)))
}

/**
 * Unicode to ASCII (encode data to Base64)
 * @param {string} data
 * @returns {string}
 */
export function utoa(data: string): string {
	return btoa(unescape(encodeURIComponent(data)))
}

/**
 * @param {string | undefined} overridetxt
 * @param {string} str
 * @param {OtFAction} action
 * @param {boolean} plus
 * @param {boolean} clrdmods
 */
export function gmspan(
	overridetxt: string | undefined,
	str: string,
	action: OtFAction,
	plus = true,
	clrdmods = false
): string {
	if (overridetxt) {
		str = overridetxt
		action.overridetxt = overridetxt
	}
	let a = action
		? ` data-action='${utoa(JSON.stringify(action))}' data-otf='${action.blindroll ? "!" : ""}${action.orig}'`
		: ""
	if (action.type === "modifier") {
		if (str.startsWith("-")) str = `&minus;${str.slice(1)}` // \u2212
	}
	let s = `<span class='glinkmod'${a}>${str}`
	if (clrdmods) {
		if (plus) s = `<span class='glinkmodplus'${a}>${str}`
		else s = `<span class='glinkmodminus'${a}>${str}`
	}
	return `${s}</span>`
}

/**
 * @param {string | undefined} overridetxt
 * @param {string} str
 * @param {OtFAction} action
 * @param {string | undefined} [prefix]
 * @param {string | undefined} [comment]
 */
export function gspan(
	overridetxt: string | undefined,
	str: string,
	action: OtFAction,
	prefix = "",
	comment = ""
): string {
	if (overridetxt) {
		str = overridetxt
		prefix = ""
		comment = ""
		action.overridetxt = overridetxt
	}
	let s = "<span class='gurpslink'"
	if (action)
		s += ` data-action='${utoa(JSON.stringify(action))}' data-otf='${action.blindroll ? "!" : ""}${action.orig}'`
	s += `>${prefix ? prefix : ""}${str.trim()}</span>`
	if (comment) s += ` ${comment}`
	return s
}
