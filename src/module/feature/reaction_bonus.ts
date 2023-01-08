import { BaseFeature, FeatureType } from "./base"

export class ReactionBonus extends BaseFeature {
	sources: string[] = []

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.ReactionBonus,
			situation: "from others",
		})
	}
}

export interface ReactionBonus extends BaseFeature {
	situation: string
	sources: string[]
}
