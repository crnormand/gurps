import { BaseFeature } from "./base";

export class ReactionBonus extends BaseFeature {
	sources: string[] = [];

	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "reaction_bonus",
			situation: "from others",
		});
	}

	get featureMapKey(): string {
		return "reaction";
	}
}

export interface ReactionBonus extends BaseFeature {
	situation: string;
	sources: string[];
}
