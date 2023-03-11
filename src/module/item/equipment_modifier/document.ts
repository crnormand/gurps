import { ItemGCS } from "@item/gcs"
import { SETTINGS, SYSTEM_NAME } from "@module/data"
import {
	determineModWeightValueTypeFromString,
	extractFraction,
	Fraction,
	Fractions,
	LocalizeGURPS,
	WeightUnits,
	WeightValueType,
} from "@util"
import { EquipmentCostType, EquipmentModifierData, EquipmentWeightType } from "./data"

class EquipmentModifierGURPS extends ItemGCS {
	// Static get schema(): typeof EquipmentModifierData {
	// 	return EquipmentModifierData;
	// }

	get enabled(): boolean {
		return !this.system.disabled
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get costType(): EquipmentCostType {
		return this.system.cost_type
	}

	get costAmount(): string {
		return this.system.cost
	}

	get weightUnits(): WeightUnits {
		if (this.actor) return this.actor.weightUnits
		const default_settings = game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`) as any
		return default_settings.default_weight_units
	}

	get weightDescription(): string {
		if (
			this.weightType === "to_original_weight" &&
			(this.weightAmount === "" || this.weightAmount.startsWith("+0"))
		)
			return ""
		return (
			this.formatWeight(this.system.weight, this.weightUnits) +
			LocalizeGURPS.translations.gurps.select.eqp_mod_weight_type[this.weightType]
		)
	}

	formatWeight(weight: string, unit: string): string {
		const t = determineModWeightValueTypeFromString(weight)
		let result = this._formatWeight(t, extractFraction(weight))
		if (t === "weight_addition") {
			result += ` ${game.i18n.localize(unit)}`
		}
		return result
	}

	// TODO: fix
	private _formatWeight(t: WeightValueType, fraction: Fraction): string {
		return "FIX ME"
		// Switch (t) {
		// 	case "weight_addition":
		// 		return Fractions.stringWithSign(fraction)
		// 	case "weight_percentage_addition":
		// 		return Fractions.stringWithSign(fraction) + game.i18n.localize(t)
		// 	case "weight_percentage_multiplier":
		// 		if (fraction.numerator <= 0) {
		// 			fraction.numerator = 100
		// 			fraction.denominator = 1
		// 		}
		// 		return `x${Fractions.string(fraction)}`
		// 	case "weight_multiplier":
		// 		if (fraction.numerator <= 0) {
		// 			fraction.numerator = 1
		// 			fraction.denominator = 1
		// 		}
		// 		return i18n(t) + Fractions.string(fraction)
		// 	default:
		// 		return this._formatWeight("weight_addition", fraction)
		// }
	}

	get weightType(): EquipmentWeightType {
		return this.system.weight_type
	}

	get weightAmount(): string {
		return this.system.weight
	}
}

interface EquipmentModifierGURPS {
	readonly system: EquipmentModifierData
}

export { EquipmentModifierGURPS }
