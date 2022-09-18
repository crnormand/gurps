import { BaseFeature } from "./base";
import { StringCompare, StringComparison } from "@module/data";

export class SkillPointBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "skill_point_bonus",
			selection_type: "skills_with_name",
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
		});
	}

	get featureMapKey(): string {
		if (this.name?.compare === "is" && this.specialization?.compare === "none" && this.tags?.compare === "none") {
			return "skill.points" + `/${this.name?.qualifier}`;
		}
		return "skill.points" + "*";
	}
}

export interface SkillPointBonus extends BaseFeature {
	name?: StringCompare;
	specialization?: StringCompare;
	tags?: StringCompare;
}
