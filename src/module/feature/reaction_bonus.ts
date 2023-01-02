import { BaseFeature, FeatureType } from "./base"

export class ReactionBonus extends BaseFeature {
	sources: string[] = []

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.ReactionBonus,
			situation: "from others",
		})
	}

	get featureMapKey(): string {
		return "reaction"
	}
}

export interface ReactionBonus extends BaseFeature {
	situation: string
	sources: string[]
}
