import { BaseFeature, FeatureType } from "./base"

export class ConditionalModifier extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "conditional_modifier",
			situation: "triggering condition",
		})
	}

	get featureMapKey(): string {
		return FeatureType.ConditionalModifier
	}

	get adjustedAmount(): number {
		return this.amount * (this.per_level ? this.levels || 0 : 1)
	}
}

export interface ConditionalModifier extends BaseFeature {
	situation: string
}
