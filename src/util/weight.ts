import { round } from "./misc"

export class Weight {
	// Private pounds: number

	// constructor(weight: string | number) {
	// 	if (typeof weight === "string") this.pounds = Weight.fromString(weight)
	// 	else this.pounds = weight
	// }

	// get(): number {
	// 	return this.pounds
	// }

	// get string(): string {
	// 	return Weight.format(this.pounds, WeightUnits.Pound)
	// }

	static format(pounds: number, unit: WeightUnits): string {
		switch (unit) {
			case WeightUnits.Pound:
			case WeightUnits.PoundAlt:
				return `${round(pounds, 4)} ${unit}`
			case WeightUnits.Ounce:
				return `${round(pounds * 16, 4)} ${unit}`
			case WeightUnits.Ton:
			case WeightUnits.TonAlt:
				return `${round(pounds * 2000, 4)} ${unit}`
			case WeightUnits.Kilogram:
				return `${round(pounds / 2, 4)} ${unit}`
			case WeightUnits.Gram:
				return `${round(pounds * 500, 4)} ${unit}`
			default:
				return this.format(pounds, WeightUnits.Pound)
		}
	}

	static fromString(text: string): number {
		const number = parseFloat(text) || 0
		text = text.replace(/[0-9.,]/g, "").trim()
		let units = WeightUnits.Pound
		for (const unit of allWeightUnits) {
			if (text === unit) {
				units = unit
				break
			}
		}
		return Weight.toPounds(number, units)
	}

	static toPounds(weight: number, unit: WeightUnits): number {
		switch (unit) {
			case WeightUnits.Pound:
			case WeightUnits.PoundAlt:
				return weight
			case WeightUnits.Ounce:
				return weight / 16
			case WeightUnits.Ton:
			case WeightUnits.TonAlt:
				return weight * 2000
			case WeightUnits.Kilogram:
				return weight * 2
			case WeightUnits.Gram:
				return weight / 500
			default:
				return Weight.toPounds(weight, WeightUnits.Pound)
		}
	}

	static fromPounds(weight: number, unit: WeightUnits): number {
		switch (unit) {
			case WeightUnits.Pound:
			case WeightUnits.PoundAlt:
				return weight
			case WeightUnits.Ounce:
				return weight * 16
			case WeightUnits.Ton:
			case WeightUnits.TonAlt:
				return weight / 2000
			case WeightUnits.Kilogram:
				return weight / 2
			case WeightUnits.Gram:
				return weight * 500
			default:
				return Weight.toPounds(weight, WeightUnits.Pound)
		}
	}
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
