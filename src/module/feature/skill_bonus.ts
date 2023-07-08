import { StringCompare, StringComparison } from "@module/data"
import { BaseFeature } from "./base"
import { FeatureType } from "./data"

export class SkillBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.SkillBonus,
			selection_type: "skills_with_name",
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
		})
	}
}

export interface SkillBonus extends BaseFeature {
	selection_type: SkillBonusSelectionType
	name?: StringCompare
	specialization?: StringCompare
	tags?: StringCompare
}

export type SkillBonusSelectionType = "skills_with_name" | "weapons_with_name" | "this_weapon"