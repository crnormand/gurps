import { ContainedWeightReduction } from "@feature/contained_weight_reduction"
import { EquipmentGURPS } from "@item/equipment"
import { EquipmentModifierGURPS } from "@item/equipment_modifier"
import { EquipmentModifierContainerGURPS } from "@item/equipment_modifier_container"
import { ItemGCS } from "@item/gcs"
import { SETTINGS, SYSTEM_NAME } from "@module/data"
import {
	allWeightUnits,
	determineModWeightValueTypeFromString,
	extractFraction,
	round,
	Weight,
	WeightUnits,
} from "@util"
import { EquipmentContainerData } from "./data"

class EquipmentContainerGURPS extends ItemGCS {
	unsatisfied_reason = ""

	// Getters
	get other(): boolean {
		return this.system.other
	}

	get quantity(): number {
		return this.system.quantity
	}

	get value(): number {
		return this.system.value
	}

	get weight(): number {
		const baseWeight = parseFloat(this.system.weight)
		const units = this.system.weight.replace(`${baseWeight}`, "").trim()
		if (allWeightUnits.includes(units as any)) return Weight.toPounds(baseWeight, units as WeightUnits)
		return baseWeight
	}

	get weightUnits(): WeightUnits {
		if (this.actor) return this.actor.weightUnits
		const default_settings = game.settings.get(SYSTEM_NAME, `${SETTINGS.DEFAULT_SHEET_SETTINGS}.settings`) as any
		return default_settings.default_weight_units
	}

	get weightString(): string {
		return Weight.format(this.weight, this.weightUnits)
	}

	get enabled(): boolean {
		return this.equipped
	}

	get equipped(): boolean {
		return this.system.equipped
	}

	set equipped(equipped: boolean) {
		this.system.equipped = equipped
	}

	get techLevel(): string {
		return this.system.tech_level
	}

	get legalityClass(): string {
		return this.system.legality_class
	}

	get uses(): number {
		return this.system.uses
	}

	get maxUses(): number {
		return this.system.max_uses
	}

	// Embedded Items
	get children(): Collection<EquipmentGURPS | EquipmentContainerGURPS> {
		return super.children as Collection<EquipmentGURPS | EquipmentContainerGURPS>
	}

	get modifiers(): Collection<EquipmentModifierGURPS | EquipmentModifierContainerGURPS> {
		const modifiers: Collection<EquipmentModifierGURPS> = new Collection()
		for (const item of this.items) {
			if (item instanceof EquipmentModifierGURPS) modifiers.set(item.id!, item)
		}
		return modifiers
	}

	get deepModifiers(): Collection<EquipmentModifierGURPS> {
		const deepModifiers: Array<EquipmentModifierGURPS> = []
		for (const mod of this.modifiers) {
			if (mod instanceof EquipmentModifierGURPS) deepModifiers.push(mod)
			else
				for (const e of mod.deepItems) {
					if (e instanceof EquipmentModifierGURPS) deepModifiers.push(e)
				}
		}
		return new Collection(
			deepModifiers.map(item => {
				return [item.id!, item]
			})
		)
	}

	get adjustedValue(): number {
		return EquipmentGURPS.valueAdjustedForModifiers(
			this.value,
			this.deepModifiers.filter(e => e.enabled)
		)
	}

	// Value Calculator
	get extendedValue(): number {
		if (this.quantity <= 0) return 0
		let value = this.adjustedValue
		for (const ch of this.children) {
			value += ch.extendedValue
		}
		return round(value * this.quantity, 4)
	}

	adjustedWeight(for_skills: boolean, units: WeightUnits): number {
		if (for_skills && this.system.ignore_weight_for_skills) return 0
		return this.weightAdjustedForMods(units)
	}

	get adjustedWeightFast(): string {
		return Weight.format(this.adjustedWeight(false, this.weightUnits), this.weightUnits)
	}

	weightAdjustedForMods(units: WeightUnits): number {
		let percentages = 0
		let w = this.weight
		const modifiers = this.deepModifiers.filter(e => e.enabled)

		for (const mod of modifiers) {
			if (mod.weightType === "to_original_weight") {
				const t = determineModWeightValueTypeFromString(mod.weightAmount)
				const f = extractFraction(mod.weightAmount)
				const amt = f.numerator / f.denominator
				if (t === "weight_addition") {
					w = w + amt
				} else {
					percentages += amt
				}
			}
		}
		if (percentages !== 0) w += (this.weight * percentages) / 100

		w = EquipmentGURPS.processMultiplyAddWeightStep("to_base_weight", w, units, modifiers)

		w = EquipmentGURPS.processMultiplyAddWeightStep("to_final_base_weight", w, units, modifiers)

		w = EquipmentGURPS.processMultiplyAddWeightStep("to_final_weight", w, units, modifiers)

		return w
	}

	extendedWeight(for_skills: boolean, units: WeightUnits): number {
		return this.extendedWeightAdjustForMods(units, for_skills)
	}

	get extendedWeightFast(): string {
		return Weight.format(this.extendedWeight(false, this.weightUnits), this.weightUnits)
	}

	extendedWeightAdjustForMods(units: WeightUnits, for_skills: boolean): number {
		if (this.quantity <= 0) return 0
		let base = 0
		if (!for_skills || !this.system.ignore_weight_for_skills) base = this.weightAdjustedForMods(units)
		if (this.children) {
			let contained = 0
			for (const ch of this.children ?? []) {
				contained += ch.extendedWeight(for_skills, units)
			}
			let percentage = 0
			let reduction = 0
			for (const f of this.features) {
				if (f instanceof ContainedWeightReduction) {
					if (f.is_percentage_reduction) percentage += parseFloat(f.reduction)
					else reduction += parseFloat(f.reduction)
				}
			}
			for (const mod of this.deepModifiers.filter(e => e.enabled)) {
				for (const f of mod.features) {
					if (f instanceof ContainedWeightReduction) {
						if (f.is_percentage_reduction) percentage += parseFloat(f.reduction)
						else reduction += parseFloat(f.reduction)
					}
				}
			}
			if (percentage >= 100) contained = 0
			else if (percentage > 0) contained -= (contained * percentage) / 100
			base += Math.max(contained - reduction, 0)
		}
		return round(base * this.quantity, 4)
	}

	prepareBaseData(): void {
		this.system.weight = this.weightString
		super.prepareBaseData()
	}

	override exportSystemData(keepOther: boolean): any {
		const system: any = super.exportSystemData(keepOther)
		delete system.name
		return system
	}

	toggleState(): void {
		this.equipped = !this.equipped
	}
}

interface EquipmentContainerGURPS {
	readonly system: EquipmentContainerData
}

export { EquipmentContainerGURPS }
