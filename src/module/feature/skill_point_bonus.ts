import { BaseFeature, FeatureType } from "./base"
import { StringCompare, StringComparison } from "@module/data"

export class SkillPointBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.SkillPointBonus,
			selection_type: "skills_with_name",
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
		})
	}

	get featureMapKey(): string {
		if (
			this.name?.compare === StringComparison.Is &&
			this.specialization?.compare === StringComparison.None &&
			this.tags?.compare === StringComparison.None
		) {
			return `skill.points/${this.name?.qualifier}`
		}
		return "skill.points*"
	}
}

export interface SkillPointBonus extends BaseFeature {
	name?: StringCompare
	specialization?: StringCompare
	tags?: StringCompare
}
