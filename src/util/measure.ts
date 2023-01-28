import { i18n, round } from "./misc"

export type Length = number

export type Weight = number

/**
 *
 * @param n
 * @param units
 * @param u
 */
export function lengthFormat(n: Length, units: LengthUnits, u = 0): string {
	let inches = n
	switch (units) {
		case LengthUnits.FeetAndInches:
			let oneFoot = 12
			let feet = Math.trunc(inches / oneFoot)
			inches -= feet * oneFoot
			if (feet === 0 && inches === 0) {
				return "0'"
			}
			let buffer = ""
			if (feet > 0) buffer += `${feet.toString()}'`
			if (inches > 0) buffer += `${inches.toString()}"`
			return buffer
		case LengthUnits.Inch:
		case LengthUnits.Feet:
		case LengthUnits.Yard:
		case LengthUnits.Meter:
		case LengthUnits.Mile:
		case LengthUnits.Centimeter:
		case LengthUnits.Kilometer:
		case LengthUnits.AstronomicalUnit:
		case LengthUnits.Lightyear:
		case LengthUnits.Parsec:
			return `${Math.round(fromInches(inches, units) * 100) / 100} ${f(units)}`
		default:
			return lengthFormat(n, LengthUnits.FeetAndInches)
	}
}

/**
 *
 * @param n
 * @param units
 */
export function fromInches(n: Length, units: LengthUnits): number {
	let inches = n
	switch (units) {
		case LengthUnits.FeetAndInches:
		case LengthUnits.Inch:
			return inches
		case LengthUnits.Feet:
			return inches / 12
		case LengthUnits.Yard:
		case LengthUnits.Meter:
			return inches / 36
		case LengthUnits.Mile:
			return inches / 63360
		case LengthUnits.Centimeter:
			return (inches / 36) * 100
		case LengthUnits.Kilometer:
			return inches / 36000
		case LengthUnits.AstronomicalUnit:
			// 93 million miles
			return inches / 63360 / 93000000
		case LengthUnits.Lightyear:
			// 5.865 trillion miles
			return inches / 63360 / (5.865 * 10 ** 12)
		case LengthUnits.Parsec:
			// 3.26 lightyears
			return inches / 63360 / (3.26 * 5.865 * 10 ** 12)
		default:
			return fromInches(n, LengthUnits.Yard)
	}
}

/**
 *
 * @param u
 */
function f(u: LengthUnits) {
	return i18n(`gurps.length_units.${u}`)
}

/**
 *
 * @param value
 * @param unit
 */
export function lengthFromNumber(value: number, unit: LengthUnits): Length {
	return toInches(value, unit) as Length
}

/**
 *
 * @param value
 * @param fromUnit
 * @param toUnit
 */
export function getLength(value: number, fromUnit: LengthUnits, toUnit: LengthUnits): Length {
	return fromInches(toInches(value, fromUnit), toUnit)
}

/**
 *
 * @param text
 * @param defaultUnits
 */
export function lengthFromString(text: string, defaultUnits: LengthUnits): Length {
	text = text.replace(/^\+/g, "")
	allLengthUnits.forEach(unit => {
		if (text.endsWith(f(unit))) {
			const r = new RegExp(`${f(unit)}$`)
			const value = parseInt(text.replace(r, ""))
			return toInches(value, unit) as Length
		}
	})
	// If no unit types match, try feet and inches
	const feetIndex = text.indexOf("'")
	const inchIndex = text.indexOf('"')
	if (feetIndex === -1 && inchIndex === -1) {
		// Use default unit
		const value = parseInt(text)
		return toInches(value, defaultUnits) as Length
	}
	let feet = 0
	let inches = 0
	if (feetIndex !== -1) {
		const s = text.substring(0, feetIndex)
		feet = parseInt(s)
		if (!feet) return 0
	}
	if (inchIndex !== -1) {
		if (feetIndex > inchIndex) {
			console.error(`Invalid format: ${text}`)
			return 0
		}
		const s = text.substring(feetIndex + 1, inchIndex)
		inches = parseInt(s)
		if (!inches) return 0
	}
	return (feet * 12 + inches) as Length
}

/**
 *
 * @param length
 * @param unit
 */
function toInches(length: number, unit: LengthUnits): Length {
	switch (unit) {
		case LengthUnits.FeetAndInches:
		case LengthUnits.Inch:
			return length as Length
		case LengthUnits.Feet:
			return (length * 12) as Length
		case LengthUnits.Yard:
			return (length * 36) as Length
		case LengthUnits.Mile:
			return (length * 63360) as Length
		case LengthUnits.Centimeter:
			return ((length * 36) / 100) as Length
		case LengthUnits.Kilometer:
			return (length * 36000) as Length
		case LengthUnits.Meter:
			return (length * 36) as Length
		case LengthUnits.AstronomicalUnit:
			// 93 million miles
			return length * 63360 * 93000000
		case LengthUnits.Lightyear:
			// 5.865 trillion miles
			return length * 63360 * (5.865 * 10 ** 12)
		case LengthUnits.Parsec:
			// 3.26 lightyears
			return length * 63360 * (3.26 * 5.865 * 10 ** 12)
		default:
			return toInches(length, LengthUnits.FeetAndInches)
	}
}

/**
 *
 * @param weight
 * @param unit
 */
export function weightFormat(weight: Weight, unit: WeightUnits): string {
	switch (unit) {
		case WeightUnits.Pound:
		case WeightUnits.PoundAlt:
			return `${round(weight, 4)} ${unit}`
		case WeightUnits.Ounce:
			return `${round(weight * 16, 4)} ${unit}`
		case WeightUnits.Ton:
		case WeightUnits.TonAlt:
			return `${round(weight * 2000, 4)} ${unit}`
		case WeightUnits.Kilogram:
			return `${round(weight / 2, 4)} ${unit}`
		case WeightUnits.Gram:
			return `${round(weight * 500, 4)} ${unit}`
		default:
			return weightFormat(weight, WeightUnits.Pound)
	}
}

// Export function fromPounds(weight: number, unit: WeightUnits): Weight {
// 	switch (unit) {
// 		case WeightUnits.Pound:
// 		case WeightUnits.PoundAlt:
// 			return floatingMul(weight) as Weight
// 		case WeightUnits.Ounce:
// 			return floatingMul(weight * 16) as Weight
// 		case WeightUnits.Ton:
// 		case WeightUnits.TonAlt:
// 			return floatingMul(weight * 2000) as Weight
// 		case WeightUnits.Kilogram:
// 			return floatingMul(weight * 2) as Weight
// 		case WeightUnits.Gram:
// 			return floatingMul(weight * 500) as Weight
// 		default:
// 			return fromPounds(weight, WeightUnits.Pound)
// 	}
// }
/**
 *
 * @param weight
 * @param unit
 */
export function toPounds(weight: number, unit: WeightUnits): Weight {
	switch (unit) {
		case WeightUnits.Pound:
		case WeightUnits.PoundAlt:
			return weight as Weight
		case WeightUnits.Ounce:
			return (weight / 16) as Weight
		case WeightUnits.Ton:
		case WeightUnits.TonAlt:
			return (weight / 2000) as Weight
		case WeightUnits.Kilogram:
			return (weight * 2) as Weight
		case WeightUnits.Gram:
			return (weight / 500) as Weight
		default:
			return toPounds(weight, WeightUnits.Pound)
	}
}

export enum LengthUnits {
	FeetAndInches = "ft_in",
	Inch = "in",
	Feet = "ft",
	Yard = "yd",
	Mile = "mi",
	Centimeter = "cm",
	Kilometer = "km",
	Meter = "m",
	AstronomicalUnit = "au",
	Lightyear = "ly",
	Parsec = "pc",
}

export const allLengthUnits = [
	LengthUnits.FeetAndInches,
	LengthUnits.Inch,
	LengthUnits.Feet,
	LengthUnits.Yard,
	LengthUnits.Mile,
	LengthUnits.Centimeter,
	LengthUnits.Kilometer,
	LengthUnits.Meter,
	LengthUnits.AstronomicalUnit,
	LengthUnits.Lightyear,
	LengthUnits.Parsec,
]

export const lengthSymbols: Record<LengthUnits, string[]> = {
	[LengthUnits.FeetAndInches]: [],
	[LengthUnits.Inch]: ["in", "inch", "inches"],
	[LengthUnits.Feet]: ["ft", "foot", "feet"],
	[LengthUnits.Yard]: ["yd", "yard", "yards"],
	[LengthUnits.Mile]: ["mi", "mile", "miles"],
	[LengthUnits.Centimeter]: ["cm", "centimeter", "centimeters", "centimetre", "centimetres"],
	[LengthUnits.Kilometer]: ["km", "kilometer", "kilometers", "kilometre", "kilometres"],
	[LengthUnits.Meter]: ["m", "meter", "meters", "metre", "metres"],
	[LengthUnits.AstronomicalUnit]: ["au", "astronomical unit", "astronomical units"],
	[LengthUnits.Lightyear]: ["ly", "lightyear", "lightyears"],
	[LengthUnits.Parsec]: ["pc", "parsec", "parsecs"],
}

export enum WeightUnits {
	Pound = "lb",
	PoundAlt = "#",
	Ounce = "oz",
	Ton = "tn",
	TonAlt = "t",
	Kilogram = "kg",
	Gram = "g",
}

export const allWeightUnits = [
	WeightUnits.Pound,
	WeightUnits.PoundAlt,
	WeightUnits.Ounce,
	WeightUnits.Ton,
	WeightUnits.TonAlt,
	WeightUnits.Kilogram,
	WeightUnits.Gram,
]
