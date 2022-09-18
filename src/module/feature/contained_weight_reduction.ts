import { BaseFeature } from "./base";

export class ContainedWeightReduction extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "contained_weight_reduction",
			reduction: "0%",
		});
	}

	get is_percentage_reduction(): boolean {
		return this.reduction.endsWith("%");
	}

	get featureMapKey(): string {
		return "equipment.weight.sum";
	}
}

export interface ContainedWeightReduction extends BaseFeature {
	reduction: string;
}
