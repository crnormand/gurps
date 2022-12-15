import { i18n } from "./misc"

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
			return `${inches} ${f(units)}`
		case LengthUnits.Feet:
			return `${(inches / 12).toFixed(u)} ${f(units)}`
		case LengthUnits.Yard:
		case LengthUnits.Meter:
			return `${(inches / 36).toFixed(u)} ${f(units)}`
		case LengthUnits.Mile:
			return `${(inches / 63360).toFixed(u)} ${f(units)}`
		case LengthUnits.Centimeter:
			return `${((inches / 36) * 100).toFixed(u)} ${f(units)}`
		case LengthUnits.Kilometer:
			return `${(inches / 36000).toFixed(u)} ${f(units)}`
		default:
			return lengthFormat(n, LengthUnits.FeetAndInches)
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
			return `${weight} ${unit}`
		case WeightUnits.Ounce:
			return `${weight * 16} ${unit}`
		case WeightUnits.Ton:
		case WeightUnits.TonAlt:
			return `${weight * 2000} ${unit}`
		case WeightUnits.Kilogram:
			return `${weight / 2} ${unit}`
		case WeightUnits.Gram:
			return `${weight * 500} ${unit}`
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
]

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
