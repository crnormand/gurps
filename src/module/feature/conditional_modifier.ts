import { BaseFeature } from "./base";

export class ConditionalModifier extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "conditional_modifier",
			situation: "triggering condition",
		});
	}

	get featureMapKey(): string {
		return "conditional_modifier";
	}
}

export interface ConditionalModifier extends BaseFeature {
	situation: string;
}
