import { NumberCompare, NumberComparison, StringCompare, StringComparison, Study, StudyType } from "@module/data"
import { v4 as uuidv4 } from "uuid"

/**
 *
 * @param value
 * @param fallback
 */
export function i18n(value: string, fallback?: string): string {
	const result = (game as Game).i18n.localize(value)
	if (fallback) return value === result ? fallback : result
	return result
}

/**
 * @param value
 * @param data
 * @param fallback
 * @returns {string}
 */
export function i18n_f(value: string, data: Record<string, unknown>, fallback?: string): string {
	const template = (game as Game).i18n.has(value) ? value : fallback
	if (!template) return value
	const result = (game as Game).i18n.format(template, data)
	if (fallback) return value === result ? fallback : result
	return result
}

/**
 *
 * @param id
 * @param permit_leading_digits
 * @param reserved
 */
export function sanitize(id: string, permit_leading_digits: boolean, reserved: string[]): string {
	const buffer: string[] = []
	for (let ch of id.split("")) {
		if (ch.match("[A-Z]")) ch = ch.toLowerCase()
		if (ch === "_" || ch.match("[a-z]") || (ch.match("[0-9]") && (permit_leading_digits || buffer.length > 0)))
			buffer.push(ch)
	}
	if (buffer.length === 0) buffer.push("_")
	let ok = true
	while (ok) {
		ok = true
		id = buffer.join("")
		for (const r of reserved) {
			if (r === id) {
				buffer.push("_")
				ok = false
				break
			}
		}
		if (ok) return id
	}
	// Cannot reach
	return ""
}

/**
 *
 */
export function newUUID(): string {
	return uuidv4()
}

/**
 *
 */
export function getCurrentTime(): string {
	return new Date().toISOString()
}

/**
 *
 * @param value
 * @param base
 */
export function stringCompare(value?: string | string[] | null, base?: StringCompare): boolean {
	if (!base) return true
	if (!value) return false
	if (typeof value === "string") value = [value]
	value = value.map(e => {
		return e.toLowerCase()
	})
	switch (base.compare) {
		case StringComparison.None:
			return true
		case StringComparison.Is:
			return !!base.qualifier && value.includes(base.qualifier)
		case StringComparison.IsNot:
			return !!base.qualifier && !value.includes(base.qualifier)
		case StringComparison.Contains:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return true
			return false
		case StringComparison.DoesNotContain:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return false
			return true
		case StringComparison.StartsWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return true
			return false
		case StringComparison.DoesNotStartWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return false
			return true
		case StringComparison.EndsWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return true
			return false
		case StringComparison.DoesNotEndWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return false
			return true
	}
}

/**
 *
 * @param value
 * @param base
 */
export function numberCompare(value: number, base?: NumberCompare): boolean {
	if (!base) return true
	switch (base.compare) {
		case NumberComparison.None:
			return true
		case NumberComparison.Is:
			return value === base.qualifier
		case NumberComparison.IsNot:
			return value !== base.qualifier
		case NumberComparison.AtMost:
			return value <= base.qualifier
		case NumberComparison.AtLeast:
			return value >= base.qualifier
	}
}

/**
 *
 * @param str
 */
export function extractTechLevel(str: string): number {
	return Math.min(Math.max(0, parseInt(str)), 12)
}

export type WeightValueType =
	| "weight_addition"
	| "weight_percentage_addition"
	| "weight_percentage_multiplier"
	| "weight_multiplier"

/**
 *
 * @param s
 */
export function determineModWeightValueTypeFromString(s: string): WeightValueType {
	if (typeof s !== "string") s = `${s}`
	s = s.toLowerCase().trim()
	if (s.endsWith("%")) {
		if (s.startsWith("x")) return "weight_percentage_multiplier"
		return "weight_percentage_addition"
	} else if (s.endsWith("x") || s.startsWith("x")) return "weight_multiplier"
	return "weight_addition"
}

export interface Fraction {
	numerator: number
	denominator: number
}

/**
 *
 * @param s
 */
export function extractFraction(s: string): Fraction {
	if (typeof s !== "string") s = `${s}`
	let v = s.trim()
	while (v.length > 0 && v.at(-1)?.match("[0-9]")) {
		v = v.substring(0, v.length - 1)
	}
	const f = v.split("/")
	const fraction: Fraction = {
		numerator: parseInt(f[0]) || 0,
		denominator: parseInt(f[1]) || 1,
	}
	const revised = determineModWeightValueTypeFromString(s)
	if (revised === "weight_percentage_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 100
			fraction.denominator = 1
		}
	} else if (revised === "weight_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 1
			fraction.denominator = 1
		}
	}
	return fraction
}

/**
 *
 * @param i
 */
export function dollarFormat(i: number): string {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	})
	return formatter.format(i)
}

/**
 *
 * @param {...any} args
 */
export function floatingMul(...args: number[]): number {
	let multiplier = 100
	let x = args.length
	let result = multiplier
	for (const arg of args) {
		const newArg = arg * multiplier
		result *= newArg
	}
	return parseFloat((result / multiplier ** (x + 1)).toPrecision(12))
}

/**
 *
 * @param n
 */
export function toWord(n: number): string {
	switch (n) {
		case 1:
			return "one"
		case 2:
			return "two"
		case 3:
			return "three"
		case 4:
			return "four"
		case 5:
			return "five"
		case 6:
			return "six"
		default:
			return "d6"
	}
}

/**
 *
 * @param str
 */
export function removeAccents(str: string): string {
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/([^\w]+|\s+)/g, "-") // Replace space and other characters by hyphen
		.replace(/--+/g, "-") // Replaces multiple hyphens by one hyphen
		.replace(/(^-+|-+$)/g, "")
}

/**
 *
 * @param s
 */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

// Object.defineProperty(String.prototype, 'capitalize', {
// 	value: function() {
// 		return this.charAt(0).toUpperCase() + this.slice(1);
// 	},
// 	enumerable: false
// });

/**
 *
 * @param s
 */
export function getAdjustedStudyHours(s: Study): number {
	switch (s.type) {
		case StudyType.Self:
			return s.hours * 0.5
		case StudyType.Job:
			return s.hours * 0.25
		case StudyType.Teacher:
			return s.hours
		case StudyType.Intensive:
			return s.hours * 2
	}
}

/**
 *
 * @param _event
 * @param formData
 * @param object
 */
export function prepareFormData(_event: Event, formData: any, object: any): any {
	for (let aKey of Object.keys(formData)) {
		if (formData[aKey] === null) formData[aKey] = "0"
		if (aKey.includes(".halve_")) {
			const tKey = aKey.replace(/\.halve_.*$/, "")
			const tOp = aKey.split(".").at(-1)
			// Console.log(tKey, tOp)
			formData[`${tKey}.ops`] ??= []
			if (formData[aKey]) formData[`${tKey}.ops`].push(tOp)
			delete formData[aKey]
		}
	}
	for (let aKey of Object.keys(formData)) {
		if (aKey.startsWith("array.") && aKey.match(/\d/)) {
			const key = aKey.replace(/^array./g, "")
			const arrayKey = key.split(/.\d+./)[0]
			const array: any[] = getProperty(object, arrayKey)
			const index = parseInt(key.match(/.(\d+)./)![1])
			const prop = key.replace(new RegExp(`^${arrayKey}.${index}.`), "")
			setArrayProperty(array, index, prop, formData[aKey])
			formData[arrayKey] = array
			delete formData[aKey]
		} else if (aKey.startsWith("array.")) {
			formData[aKey.replace("array.", "")] = formData[aKey]
			delete formData[aKey]
		}
	}
	return formData
}

/**
 *
 * @param a
 * @param index
 * @param prop
 * @param value
 */
function setArrayProperty(a: any[], index: number, prop: string, value: any): any[] {
	if (prop.match(/.\d+./)) {
		const inArrayKey = prop.split(/.\d+./)[0]
		const inArrayArray = getProperty(a[index], inArrayKey)
		const inArrayIndex = parseInt(prop.match(/.(\d+)./)![1])
		const inArrayProp = prop.replace(`${inArrayKey}.${inArrayIndex}.`, "")
		setProperty(a[index], inArrayKey, setArrayProperty(inArrayArray, inArrayIndex, inArrayProp, value))
		return a
	}
	setProperty(a[index], prop, value)
	return a
}
