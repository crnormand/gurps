import { BaseFeature, FeatureType } from "./base"

export class AttributeBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.AttributeBonus,
			attribute: "st",
			limitation: "none",
		})
	}

	get featureMapKey(): string {
		let key = `attr.${this.attribute}`
		if (this.limitation && this.limitation !== "none") {
			key += `.${this.limitation}`
		}
		return key
	}
}

export interface AttributeBonus extends BaseFeature {
	attribute: string
	limitation: AttributeBonusLimitation
}

export enum AttributeBonusLimitation {
	None = "none",
	Striking = "striking_only",
	Lifting = "lifting_only",
	Throwing = "throwing_only",
}
