import { NumberCompare, NumberComparison, StringCompare, StringComparison } from "@module/data";
import { v4 as uuidv4 } from "uuid";

/**
 *
 * @param value
 * @param fallback
 */
export function i18n(value: string, fallback?: string): string {
	const result = (game as Game).i18n.localize(value);
	if (fallback) return value === result ? fallback : result;
	return result;
}

/**
 *
 * @param value
 * @param data
 * @param fallback
 */
export function i18n_f(value: string, data: Record<string, unknown>, fallback?: string): string {
	const template = (game as Game).i18n.has(value) ? value : fallback;
	if (!template) return value;
	const result = (game as Game).i18n.format(template, data);
	if (fallback) return value === result ? fallback : result;
	return result;
}

/**
 *
 * @param i
 */
export function signed(i: string | number): string {
	if (i === "") i = "0";
	if (typeof i === "string") i = parseFloat(i);
	if (i >= 0) return `+${i.toString()}`;
	return i.toString();
}

/**
 *
 * @param id
 * @param permit_leading_digits
 * @param reserved
 */
export function sanitize(id: string, permit_leading_digits: boolean, reserved: string[]): string {
	const buffer: string[] = [];
	for (let ch of id.split("")) {
		if (ch.match("[A-Z]")) ch = ch.toLowerCase();
		if (ch === "_" || ch.match("[a-z]") || (ch.match("[0-9]") && (permit_leading_digits || buffer.length > 0)))
			buffer.push(ch);
	}
	if (buffer.length === 0) buffer.push("_");
	let ok = true;
	while (ok) {
		ok = true;
		id = buffer.join("");
		for (const r of reserved) {
			if (r === id) {
				buffer.push("_");
				ok = false;
				break;
			}
		}
		if (ok) return id;
	}
	// Cannot reach
	return "";
}

/**
 *
 */
export function newUUID(): string {
	return uuidv4();
}

/**
 *
 */
export function getCurrentTime(): string {
	return new Date().toISOString();
}

/**
 *
 * @param value
 * @param base
 */
export function stringCompare(value?: string | string[] | null, base?: StringCompare): boolean {
	if (!base) return true;
	if (!value) return false;
	if (typeof value === "string") value = [value];
	value = value.map(e => {
		return e.toLowerCase();
	});
	switch (base.compare) {
		case StringComparison.None:
			return true;
		case StringComparison.Is:
			return !!base.qualifier && value.includes(base.qualifier);
		case StringComparison.IsNot:
			return !!base.qualifier && !value.includes(base.qualifier);
		case StringComparison.Contains:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return true;
			return false;
		case StringComparison.DoesNotContain:
			for (const v of value) if (base.qualifier && v.includes(base.qualifier)) return false;
			return true;
		case StringComparison.StartsWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return true;
			return false;
		case StringComparison.DoesNotStartWith:
			for (const v of value) if (base.qualifier && v.startsWith(base.qualifier)) return false;
			return true;
		case StringComparison.EndsWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return true;
			return false;
		case StringComparison.DoesNotEndWith:
			for (const v of value) if (base.qualifier && v.endsWith(base.qualifier)) return false;
			return true;
	}
}

/**
 *
 * @param value
 * @param base
 */
export function numberCompare(value: number, base?: NumberCompare): boolean {
	if (!base) return true;
	switch (base.compare) {
		case NumberComparison.None:
			return true;
		case NumberComparison.Is:
			return value === base.qualifier;
		case NumberComparison.IsNot:
			return value !== base.qualifier;
		case NumberComparison.AtMost:
			return value <= base.qualifier;
		case NumberComparison.AtLeast:
			return value >= base.qualifier;
	}
}

/**
 *
 * @param str
 */
export function extractTechLevel(str: string): number {
	return Math.min(Math.max(0, parseInt(str)), 12);
}

export type WeightValueType =
	| "weight_addition"
	| "weight_percentage_addition"
	| "weight_percentage_multiplier"
	| "weight_multiplier";

/**
 *
 * @param s
 */
export function determineModWeightValueTypeFromString(s: string): WeightValueType {
	if (typeof s !== "string") s = `${s}`;
	s = s.toLowerCase().trim();
	if (s.endsWith("%")) {
		if (s.startsWith("x")) return "weight_percentage_multiplier";
		return "weight_percentage_addition";
	} else if (s.endsWith("x") || s.startsWith("x")) return "weight_multiplier";
	return "weight_addition";
}

export interface Fraction {
	numerator: number;
	denominator: number;
}

/**
 *
 * @param s
 */
export function extractFraction(s: string): Fraction {
	if (typeof s !== "string") s = `${s}`;
	let v = s.trim();
	while (v.length > 0 && v[-1].match("[0-9]")) {
		v = v.substring(0, v.length - 1);
	}
	const f = v.split("/");
	const fraction: Fraction = {
		numerator: parseInt(f[0]) || 0,
		denominator: parseInt(f[1]) || 1,
	};
	const revised = determineModWeightValueTypeFromString(s);
	if (revised === "weight_percentage_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 100;
			fraction.denominator = 1;
		}
	} else if (revised === "weight_multiplier") {
		if (fraction.numerator <= 0) {
			fraction.numerator = 1;
			fraction.denominator = 1;
		}
	}
	return fraction;
}

/**
 *
 * @param i
 */
export function dollarFormat(i: number): string {
	const formatter = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	});
	return formatter.format(i);
}

/**
 *
 * @param {...any} args
 */
export function floatingMul(...args: number[]): number {
	let multiplier = 100;
	let x = args.length;
	let result = multiplier;
	for (const arg of args) {
		const newArg = arg * multiplier;
		result *= newArg;
	}
	return parseFloat((result / multiplier ** (x + 1)).toPrecision(12));
}

/**
 *
 * @param obj
 */
export function toArray(obj: any): any[] {
	if (Array.isArray(obj)) return obj;
	const arr: any[] = [];
	for (const [key, value] of Object.entries(obj)) {
		if (!isNaN(key as any) && !arr[parseInt(key)]) arr.push(value);
	}
	return arr;
}

/**
 *
 * @param n
 */
export function toWord(n: number): string {
	switch (n) {
		case 1:
			return "one";
		case 2:
			return "two";
		case 3:
			return "three";
		case 4:
			return "four";
		case 5:
			return "five";
		case 6:
			return "six";
		default:
			return "d6";
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
		.replace(/(^-+|-+$)/g, "");
}

/**
 *
 * @param s
 */
export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Object.defineProperty(String.prototype, 'capitalize', {
// 	value: function() {
// 		return this.charAt(0).toUpperCase() + this.slice(1);
// 	},
// 	enumerable: false
// });
