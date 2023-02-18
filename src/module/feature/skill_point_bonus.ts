import { StringCompare, StringComparison } from "@module/data"
import { BaseFeature } from "./base"
import { FeatureType } from "./data"

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
}

export interface SkillPointBonus extends BaseFeature {
	name?: StringCompare
	specialization?: StringCompare
	tags?: StringCompare
}
