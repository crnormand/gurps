import { ContainedWeightReduction } from "@feature/contained_weight_reduction"
import { EquipmentContainerGURPS } from "@item/equipment_container"
import { EquipmentModifierGURPS } from "@item/equipment_modifier"
import { EquipmentCostType, EquipmentWeightType } from "@item/equipment_modifier/data"
import { EquipmentModifierContainerGURPS } from "@item/equipment_modifier_container"
import { ItemGCS } from "@item/gcs"
import { DisplayMode, SETTINGS, SYSTEM_NAME } from "@module/data"
import {
	allWeightUnits,
	determineModWeightValueTypeFromString,
	extractFraction,
	round,
	Weight,
	WeightUnits,
} from "@util"
import { HandlebarsHelpersGURPS } from "@util/handlebars_helpers"
import { CostValueType, EquipmentData } from "./data"

class EquipmentGURPS extends ItemGCS {
	unsatisfied_reason = ""

	// Static override get schema(): typeof EquipmentData {
	// 	return EquipmentData;
	// }

	// Getters

	override get notes(): string {
		let outString = "<div class=\"item-notes\">"
		if ([DisplayMode.Inline, DisplayMode.InlineAndTooltip].includes(this.actor.settings.modifiers_display)) {
			this.modifiers.filter(e => e.enabled).forEach((mod, i) => {
				if (i !== 0) outString += "; "
				outString += mod.name + (mod.system.notes ? ` (${mod.system.notes})` : "")
			})
		}
		if (this.modifiers.some(e => e.enabled)) outString += "<br>"
		if (this.system.notes) outString += HandlebarsHelpersGURPS.format(this.system.notes)
		if (this.unsatisfied_reason) outString += HandlebarsHelpersGURPS.unsatisfied(this.unsatisfied_reason)
		outString += "</div>"
		return outString
	}

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
		return round(
			EquipmentGURPS.valueAdjustedForModifiers(
				this.value,
				this.deepModifiers.filter(e => e.enabled)
			),
			4
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

	get adjustedWeightFast(): string {
		return Weight.format(this.adjustedWeight(false, this.weightUnits), this.weightUnits)
	}

	adjustedWeight(for_skills: boolean, units: WeightUnits): number {
		if (for_skills && this.system.ignore_weight_for_skills) return 0
		return this.weightAdjustedForMods(units)
	}

	extendedWeight(for_skills: boolean, units: WeightUnits): number {
		return round(this.extendedWeightAdjustForMods(units, for_skills), 4)
	}

	get extendedWeightFast(): string {
		return Weight.format(this.extendedWeight(false, this.weightUnits), this.weightUnits)
	}

	prepareBaseData(): void {
		this.system.weight = this.weightString
		super.prepareBaseData()
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

		return Math.max(w, 0)
	}

	override exportSystemData(keepOther: boolean): any {
		const system: any = super.exportSystemData(keepOther)
		system.type = "equipment"
		delete system.name
		system.calc = {
			extended_value: this.extendedValue,
			extended_weight: this.extendedWeightFast,
		}
		return system
	}

	toggleState(): void {
		this.equipped = !this.equipped
	}

	static valueAdjustedForModifiers(value: number, modifiers: EquipmentModifierGURPS[]): number {
		let cost = EquipmentGURPS.processNonCFStep("to_original_cost", value, modifiers)

		let cf = 0
		for (const mod of modifiers) {
			if (mod.costType === "to_base_cost") {
				let t = EquipmentGURPS.determineModCostValueTypeFromString(mod.costAmount)
				cf += EquipmentGURPS.extractValue(mod.costAmount)
				if (t === "multiplier") cf -= 1
			}
		}
		if (cf !== 0) {
			cf = Math.max(cf, -0.8)
			cost *= Math.max(cf, -0.8) + 1
		}
		cost = EquipmentGURPS.processNonCFStep("to_final_base_cost", cost, modifiers)
		cost = EquipmentGURPS.processNonCFStep("to_final_cost", cost, modifiers)

		return Math.max(cost, 0)
	}

	static processNonCFStep(costType: EquipmentCostType, value: number, modifiers: EquipmentModifierGURPS[]): number {
		let cost = value
		let percentages = 0
		let additions = 0
		for (const mod of modifiers) {
			if (mod.costType === costType) {
				let t = EquipmentGURPS.determineModCostValueTypeFromString(mod.costAmount)
				let amt = EquipmentGURPS.extractValue(mod.costAmount)
				if (t === "addition") additions += amt
				if (t === "percentage") percentages += amt
				if (t === "multiplier") cost *= amt
			}
		}
		cost += additions
		if (percentages !== 0) cost += (value * percentages) / 100

		return cost
	}

	static determineModCostValueTypeFromString(v: string): CostValueType {
		const s = v.toLowerCase().trim()
		if (s.endsWith("cf")) return "addition"
		else if (s.endsWith("%")) return "percentage"
		else if (s.startsWith("x") || s.endsWith("x")) return "multiplier"
		return "addition"
	}

	static extractValue(s: string): number {
		let v = EquipmentGURPS.extract(s.trim())
		if (EquipmentGURPS.determineModCostValueTypeFromString(s) === "multiplier" && v <= 0) v = 1
		return v
	}

	static extract(s: string): number {
		let last = 0
		let max = s.length
		if (last < max && s[last] === " ") last++
		if (last >= max) return 0
		let ch = s[last]
		let found = false
		let decimal = false
		let start = last
		while ((start === last && ["+", "-"].includes(ch)) || (!decimal && ch === ".") || ch.match("[0-9]")) {
			if (ch.match("[0-9]")) found = true
			if (ch === ".") decimal = true
			last++
			if (last >= max) break
			ch = s[last]
		}
		if (!found) return 0
		let value = parseFloat(s.substring(start, last))
		if (isNaN(value)) return 0
		return value
	}

	static processMultiplyAddWeightStep(
		type: EquipmentWeightType,
		weight: number,
		_units: WeightUnits,
		modifiers: EquipmentModifierGURPS[]
	): number {
		let sum = 0
		for (const mod of modifiers) {
			if (mod.weightType === type) {
				const t = determineModWeightValueTypeFromString(mod.weightAmount)
				const f = extractFraction(mod.weightAmount)
				if (t === "weight_addition") sum += parseFloat(mod.weightAmount)
				else if (t === "weight_percentage_multiplier") weight = (weight * f.numerator) / (f.denominator * 100)
				else if (t === "weight_multiplier") weight = (weight * f.numerator) / f.denominator
			}
		}
		return weight + sum
	}
}

interface EquipmentGURPS {
	readonly system: EquipmentData
}

export { EquipmentGURPS }
