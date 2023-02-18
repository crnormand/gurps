import { NumberCompare, NumberComparison, StringCompare, StringComparison } from "@module/data"
import { BaseFeature } from "./base"
import { FeatureType, WeaponBonusSelectionType } from "./data"

export class WeaponDamageBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.WeaponBonus,
			percent: false,
			selection_type: "weapons_with_required_skill",
			name: { compare: StringComparison.Is, qualifier: "" },
			specialization: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
			level: { compare: NumberComparison.None, qualifier: "" },
		})
	}
}
export interface WeaponDamageBonus extends BaseFeature {
	selection_type: WeaponBonusSelectionType
	name?: StringCompare
	specialization?: StringCompare
	tags?: StringCompare
	level?: NumberCompare
	percent: boolean
}
