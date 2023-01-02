import { BaseFeature, FeatureType } from "./base"

export class CostReduction extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.CostReduction,
			attribute: "st",
			percentage: 40,
		})
	}
}

export interface CostReduction extends BaseFeature {
	attribute: string
	percentage: number
}
