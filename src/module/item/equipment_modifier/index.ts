import { BaseItemGURPS } from "@item/base";
import {
	determineModWeightValueTypeFromString,
	extractFraction,
	Fraction,
	Fractions,
	i18n,
	WeightValueType,
} from "@util";
import { EquipmentCostType, EquipmentModifierData, EquipmentWeightType } from "./data";

export class EquipmentModifierGURPS extends BaseItemGURPS {
	// Static get schema(): typeof EquipmentModifierData {
	// 	return EquipmentModifierData;
	// }

	get enabled(): boolean {
		return !this.system.disabled;
	}

	get techLevel(): string {
		return this.system.tech_level;
	}

	get costType(): EquipmentCostType {
		return this.system.cost_type;
	}

	get costAmount(): string {
		return this.system.cost;
	}

	get weightDescription(): string {
		if (
			this.weightType === "to_original_weight" &&
			(this.weightAmount === "" || this.weightAmount.startsWith("+0"))
		)
			return "";
		return this.formatWeight(this.system.weight, "lb") + i18n(this.weightType);
	}

	formatWeight(weight: string, unit: string): string {
		const t = determineModWeightValueTypeFromString(weight);
		let result = this._formatWeight(t, extractFraction(weight));
		if (t === "weight_addition") {
			result += ` ${i18n(unit)}`;
		}
		return result;
	}

	private _formatWeight(t: WeightValueType, fraction: Fraction): string {
		switch (t) {
			case "weight_addition":
				return Fractions.stringWithSign(fraction);
			case "weight_percentage_addition":
				return Fractions.stringWithSign(fraction) + i18n(t);
			case "weight_percentage_multiplier":
				if (fraction.numerator <= 0) {
					fraction.numerator = 100;
					fraction.denominator = 1;
				}
				return `x${Fractions.string(fraction)}${i18n(t)}`;
			case "weight_multiplier":
				if (fraction.numerator <= 0) {
					fraction.numerator = 1;
					fraction.denominator = 1;
				}
				return i18n(t) + Fractions.string(fraction);
			default:
				return this._formatWeight("weight_addition", fraction);
		}
	}

	get weightType(): EquipmentWeightType {
		return this.system.weight_type;
	}

	get weightAmount(): string {
		return this.system.weight;
	}
}

export interface EquipmentModifierGURPS {
	readonly system: EquipmentModifierData;
}
