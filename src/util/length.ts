import { LocalizeGURPS } from "./localize"

// Export type Length = number

// Export type Weight = number
export class Length {
	static format(inches: number, unit: LengthUnits): string {
		switch (unit) {
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
				return `${Math.round(Length.fromInches(inches, unit) * 100) / 100} ${Length.f(unit)}`
			default:
				return Length.format(inches, LengthUnits.FeetAndInches)
		}
	}

	static fromString(text: string): number {
		text = text.replace(/^\+/g, "")
		allLengthUnits.forEach(unit => {
			if (text.endsWith(Length.f(unit))) {
				const r = new RegExp(`${Length.f(unit)}$`)
				const value = parseInt(text.replace(r, ""))
				return Length.toInches(value, unit) as Length
			}
		})
		const feetIndex = text.indexOf("'")
		const inchIndex = text.indexOf('"')
		if (feetIndex === -1 && inchIndex === -1) {
			// Assume inches
			return parseInt(text)
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
		return feet * 12 + inches
	}

	static toInches(length: number, unit: LengthUnits): number {
		switch (unit) {
			case LengthUnits.FeetAndInches:
			case LengthUnits.Inch:
				return length
			case LengthUnits.Feet:
				return length * 12
			case LengthUnits.Yard:
				return length * 36
			case LengthUnits.Mile:
				return length * 63360
			case LengthUnits.Centimeter:
				return length / 2.5
			case LengthUnits.Kilometer:
				return length * 36000
			case LengthUnits.Meter:
				return length * 36
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
				return Length.toInches(length, LengthUnits.FeetAndInches)
		}
	}

	static fromInches(length: number, unit: LengthUnits): number {
		switch (unit) {
			case LengthUnits.FeetAndInches:
			case LengthUnits.Inch:
				return length
			case LengthUnits.Feet:
				return length / 12
			case LengthUnits.Yard:
			case LengthUnits.Meter:
				return length / 36
			case LengthUnits.Mile:
				return length / 63360
			case LengthUnits.Centimeter:
				return length * 2.5
			case LengthUnits.Kilometer:
				return length / 36000
			case LengthUnits.AstronomicalUnit:
				// 93 million miles
				return length / 63360 / 93000000
			case LengthUnits.Lightyear:
				// 5.865 trillion miles
				return length / 63360 / (5.865 * 10 ** 12)
			case LengthUnits.Parsec:
				// 3.26 lightyears
				return length / 63360 / (3.26 * 5.865 * 10 ** 12)
			default:
				return Length.fromInches(length, LengthUnits.Yard)
		}
	}

	private static f(u: LengthUnits) {
		return LocalizeGURPS.translations.gurps.length_units[u]
	}
}

// Export function getLength(value: number, fromUnit: LengthUnits, toUnit: LengthUnits): Length {
// 	return fromInches(toInches(value, fromUnit), toUnit)
// }

// export function lengthFromString(text: string, defaultUnits: LengthUnits): Length {
// 	text = text.replace(/^\+/g, "")
// 	allLengthUnits.forEach(unit => {
// 		if (text.endsWith(f(unit))) {
// 			const r = new RegExp(`${f(unit)}$`)
// 			const value = parseInt(text.replace(r, ""))
// 			return toInches(value, unit) as Length
// 		}
// 	})
// 	// If no unit types match, try feet and inches
// 	const feetIndex = text.indexOf("'")
// 	const inchIndex = text.indexOf('"')
// 	if (feetIndex === -1 && inchIndex === -1) {
// 		// Use default unit
// 		const value = parseInt(text)
// 		return toInches(value, defaultUnits) as Length
// 	}
// 	let feet = 0
// 	let inches = 0
// 	if (feetIndex !== -1) {
// 		const s = text.substring(0, feetIndex)
// 		feet = parseInt(s)
// 		if (!feet) return 0
// 	}
// 	if (inchIndex !== -1) {
// 		if (feetIndex > inchIndex) {
// 			console.error(`Invalid format: ${text}`)
// 			return 0
// 		}
// 		const s = text.substring(feetIndex + 1, inchIndex)
// 		inches = parseInt(s)
// 		if (!inches) return 0
// 	}
// 	return (feet * 12 + inches) as Length
// }

// /**
//  *
//  * @param length
//  * @param unit
//  */
// function toInches(length: number, unit: LengthUnits): Length {
// 	switch (unit) {
// 		case LengthUnits.FeetAndInches:
// 		case LengthUnits.Inch:
// 			return length as Length
// 		case LengthUnits.Feet:
// 			return (length * 12) as Length
// 		case LengthUnits.Yard:
// 			return (length * 36) as Length
// 		case LengthUnits.Mile:
// 			return (length * 63360) as Length
// 		case LengthUnits.Centimeter:
// 			return (length / 2.5) as Length
// 		case LengthUnits.Kilometer:
// 			return (length * 36000) as Length
// 		case LengthUnits.Meter:
// 			return (length * 36) as Length
// 		case LengthUnits.AstronomicalUnit:
// 			// 93 million miles
// 			return length * 63360 * 93000000
// 		case LengthUnits.Lightyear:
// 			// 5.865 trillion miles
// 			return length * 63360 * (5.865 * 10 ** 12)
// 		case LengthUnits.Parsec:
// 			// 3.26 lightyears
// 			return length * 63360 * (3.26 * 5.865 * 10 ** 12)
// 		default:
// 			return toInches(length, LengthUnits.FeetAndInches)
// 	}
// }

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

export const LengthSymbols: Record<LengthUnits, string[]> = {
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
