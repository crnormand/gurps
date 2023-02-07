import { BaseFeature } from "./base"
import { FeatureType } from "./data"

export class DRBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.DRBonus,
			location: "torso",
			specialization: "all",
		})
	}
}

export interface DRBonus extends BaseFeature {
	location: string
	specialization?: string
}
