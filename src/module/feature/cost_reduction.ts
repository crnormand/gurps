import { BaseFeature, FeatureType } from "./base";

export class CostReduction extends BaseFeature {
	type: FeatureType = "cost_reduction";

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "cost_reduction",
			attribute: "st",
			percentage: 40,
		});
	}
}

export interface CostReduction extends BaseFeature {
	attribute: string;
	percentage: number;
}
