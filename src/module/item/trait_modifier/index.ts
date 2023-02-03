import { BaseItemGURPS } from "@item/base"
import { TraitModifierAffects, TraitModifierCostType, TraitModifierData } from "./data"

class TraitModifierGURPS extends BaseItemGURPS {
	// Static get schema(): typeof TraitModifierData {
	// 	return TraitModifierData;
	// }

	prepareBaseData() {
		super.prepareBaseData()
		// HACK: find a way to avoid this
		if (typeof this.system.levels === "string") this.system.levels = parseInt(this.system.levels)
	}

	// Getters
	get levels(): number {
		return this.system.levels
	}

	get costDescription() {
		let base = ""
		if (this.costType === "percentage") {
			if (this.hasLevels) {
				base = (this.cost * this.levels).signedString()
			} else {
				base = this.cost.signedString()
			}
			base += "%"
		} else if (this.costType === "points") base = this.cost.signedString()
		else if (this.costType === "multiplier") return `×${this.cost}`
		return base
	}

	get enabled(): boolean {
		return !this.system.disabled
	}

	get costType(): TraitModifierCostType {
		return this.system.cost_type
	}

	get affects(): TraitModifierAffects {
		return this.system.affects
	}

	get cost(): number {
		return this.system.cost
	}

	get costModifier(): number {
		if (this.levels > 0) return this.cost * this.levels
		return this.cost
	}

	get fullDescription(): string {
		let d = ""
		d += this.name
		if (this.notes) d += ` (${this.notes})`
		if (this.actor && this.actor.settings.show_trait_modifier_adj) d += ` [${this.costDescription}]`
		return d
	}

	get hasLevels(): boolean {
		return this.costType === "percentage" && this.levels > 0
	}
}
interface TraitModifierGURPS {
	readonly system: TraitModifierData
}

export { TraitModifierGURPS }
