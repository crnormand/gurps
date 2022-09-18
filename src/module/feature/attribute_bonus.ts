import { BaseFeature, FeatureConstructionContext } from "./base";

export class AttributeBonus extends BaseFeature {
	constructor(data: AttributeBonus | any, context: FeatureConstructionContext) {
		super(data, context);
	}

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "attribute_bonus",
			attribute: "st",
			limitation: "none",
		});
	}

	get featureMapKey(): string {
		let key = `attr.${this.attribute}`;
		if (this.limitation && this.limitation !== "none") {
			key += `.${this.limitation}`;
		}
		return key;
	}
}

export interface AttributeBonus extends BaseFeature {
	attribute: string;
	limitation: AttributeBonusLimitation;
}

type AttributeBonusLimitation = "none" | "striking_only" | "lifting_only" | "throwing_only";
