import { BaseFeature } from "./base"
import { FeatureType } from "./data"

export class ContainedWeightReduction extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.ContaiedWeightReduction,
			reduction: "0%",
		})
	}

	get is_percentage_reduction(): boolean {
		return this.reduction.endsWith("%")
	}
}

export interface ContainedWeightReduction extends BaseFeature {
	reduction: string
}
