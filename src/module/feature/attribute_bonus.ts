import { BaseFeature, FeatureType } from "./base"

export class AttributeBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.AttributeBonus,
			attribute: "st",
			limitation: "none",
		})
	}
}

export interface AttributeBonus extends BaseFeature {
	type: FeatureType.AttributeBonus
	attribute: string
	limitation: AttributeBonusLimitation
}

export enum AttributeBonusLimitation {
	None = "none",
	Striking = "striking_only",
	Lifting = "lifting_only",
	Throwing = "throwing_only",
}
