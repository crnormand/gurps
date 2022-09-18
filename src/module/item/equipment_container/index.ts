import { ContainedWeightReduction } from "@feature/contained_weight_reduction";
import { ContainerGURPS } from "@item/container";
import { EquipmentGURPS, processMultiplyAddWeightStep, valueAdjustedForModifiers } from "@item/equipment";
import { EquipmentModifierGURPS } from "@item/equipment_modifier";
import { EquipmentModifierContainerGURPS } from "@item/equipment_modifier_container";
import { WeightUnits } from "@module/data";
import { determineModWeightValueTypeFromString, extractFraction, floatingMul } from "@util";
import { EquipmentContainerData } from "./data";

export class EquipmentContainerGURPS extends ContainerGURPS {
	unsatisfied_reason = "";

	// Static override get schema(): typeof EquipmentContainerData {
	// 	return EquipmentContainerData;
	// }

	// Getters
	get other(): boolean {
		return this.system.other;
	}

	get quantity(): number {
		return this.system.quantity;
	}

	get value(): number {
		return this.system.value;
	}

	get weight(): number {
		return parseFloat(this.system.weight);
	}

	// Get features() {
	// 	const features: Feature[] = [];
	// 	for (const f of this.system.features ?? []) {
	// 		features.push(new BaseFeature(f));
	// 	}
	// 	return features;
	// }

	get enabled(): boolean {
		return this.equipped;
	}

	get equipped(): boolean {
		return this.system.equipped;
	}

	get techLevel(): string {
		return this.system.tech_level;
	}

	get legalityClass(): string {
		return this.system.legality_class;
	}

	get uses(): number {
		return this.system.uses;
	}

	get maxUses(): number {
		return this.system.max_uses;
	}

	// Embedded Items
	get children(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return super.children as Collection<EquipmentGURPS | EquipmentContainerGURPS>;
	}

	get modifiers(): Collection<EquipmentModifierGURPS | EquipmentModifierContainerGURPS> {
		const modifiers: Collection<EquipmentModifierGURPS> = new Collection();
		for (const item of this.items) {
			if (item instanceof EquipmentModifierGURPS) modifiers.set(item.id!, item);
		}
		return modifiers;
	}

	get deepModifiers(): Collection<EquipmentModifierGURPS> {
		const deepModifiers: Array<EquipmentModifierGURPS> = [];
		for (const mod of this.modifiers) {
			if (mod instanceof EquipmentModifierGURPS) deepModifiers.push(mod);
			else
				for (const e of mod.deepItems) {
					if (e instanceof EquipmentModifierGURPS) deepModifiers.push(e);
				}
		}
		return new Collection(
			deepModifiers.map(item => {
				return [item.id!, item];
			})
		);
	}

	get adjustedValue(): number {
		return valueAdjustedForModifiers(this.value, this.deepModifiers);
	}

	// Value Calculator
	get extendedValue(): number {
		if (this.quantity <= 0) return 0;
		let value = this.adjustedValue;
		for (const ch of this.children) {
			value += ch.extendedValue;
		}
		return floatingMul(value * this.quantity);
	}

	adjustedWeight(for_skills: boolean, units: WeightUnits): number {
		if (for_skills && this.system.ignore_weight_for_skills) return 0;
		return this.weightAdjustedForMods(units);
	}

	get adjustedWeightFast(): string {
		return `${this.adjustedWeight(false, "lb").toString()} lb`;
	}

	weightAdjustedForMods(units: WeightUnits): number {
		let percentages = 0;
		let w = this.weight;

		for (const mod of this.deepModifiers) {
			if (mod.weightType === "to_original_weight") {
				const t = determineModWeightValueTypeFromString(mod.weightAmount);
				const f = extractFraction(mod.weightAmount);
				const amt = f.numerator / f.denominator;
				if (t === "weight_addition") {
					w = w + amt;
				} else {
					percentages += amt;
				}
			}
		}
		if (percentages !== 0) w += (this.weight * percentages) / 100;

		w = processMultiplyAddWeightStep("to_base_weight", w, units, this.deepModifiers);

		w = processMultiplyAddWeightStep("to_final_base_weight", w, units, this.deepModifiers);

		w = processMultiplyAddWeightStep("to_final_weight", w, units, this.deepModifiers);

		return w;
	}

	extendedWeight(for_skills: boolean, units: WeightUnits): number {
		return this.extendedWeightAdjustForMods(units, for_skills);
	}

	get extendedWeightFast(): string {
		return `${this.extendedWeight(false, "lb").toString()} lb`;
	}

	extendedWeightAdjustForMods(units: WeightUnits, for_skills: boolean): number {
		if (this.quantity <= 0) return 0;
		let base = 0;
		if (!for_skills || !this.system.ignore_weight_for_skills) base = this.weightAdjustedForMods(units);
		if (this.children) {
			let contained = 0;
			for (const ch of this.children ?? []) {
				contained += ch.extendedWeight(for_skills, units);
			}
			let percentage = 0;
			let reduction = 0;
			for (const f of this.features) {
				if (f instanceof ContainedWeightReduction) {
					if (f.is_percentage_reduction) percentage += parseFloat(f.reduction);
					else reduction += parseFloat(f.reduction);
				}
			}
			for (const mod of this.deepModifiers) {
				for (const f of mod.features) {
					if (f instanceof ContainedWeightReduction) {
						if (f.is_percentage_reduction) percentage += parseFloat(f.reduction);
						else reduction += parseFloat(f.reduction);
					}
				}
			}
			if (percentage >= 100) contained = 0;
			else if (percentage > 0) contained -= (contained * percentage) / 100;
			base += Math.max(contained - reduction, 0);
		}
		return floatingMul(base * this.quantity);
	}
}

export interface EquipmentContainerGURPS {
	readonly system: EquipmentContainerData;
}
