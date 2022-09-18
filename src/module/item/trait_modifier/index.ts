import { BaseItemGURPS } from "@item/base";
import { signed } from "@util";
import { TraitModifierAffects, TraitModifierCostType, TraitModifierData } from "./data";

export class TraitModifierGURPS extends BaseItemGURPS {
	// Static get schema(): typeof TraitModifierData {
	// 	return TraitModifierData;
	// }

	prepareBaseData() {
		super.prepareBaseData();
		// HACK: find a way to avoid this
		if (typeof this.system.levels === "string") this.system.levels = parseInt(this.system.levels);
	}

	// Getters
	get levels(): number {
		return this.system.levels;
	}

	get costDescription() {
		let base = "";
		if (this.costType === "percentage") {
			if (this.hasLevels) {
				base = signed(this.cost * this.levels);
			} else {
				base = signed(this.cost);
			}
			base += "%";
		} else if (this.costType === "points") base = signed(this.cost);
		else if (this.costType === "multiplier") return `${this.costType}${this.cost}`;
		return base;
	}

	get enabled(): boolean {
		return !this.system.disabled;
	}

	get costType(): TraitModifierCostType {
		return this.system.cost_type;
	}

	get affects(): TraitModifierAffects {
		return this.system.affects;
	}

	get cost(): number {
		return this.system.cost;
	}

	get costModifier(): number {
		if (this.levels > 0) return this.cost * this.levels;
		return this.cost;
	}

	get fullDescription(): string {
		let d = "";
		d += this.name;
		if (this.notes) d += ` (${this.notes})`;
		if (this.actor && this.actor.settings.show_trait_modifier_adj) d += ` [${this.costDescription}]`;
		return d;
	}

	get hasLevels(): boolean {
		return this.costType === "percentage" && this.levels > 0;
	}
}
export interface TraitModifierGURPS {
	readonly system: TraitModifierData;
}
