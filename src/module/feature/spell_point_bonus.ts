import { BaseFeature, FeatureType } from "./base"
import { StringCompare, StringComparison } from "@module/data"
import { SpellBonusMatch } from "./spell_bonus"
import { stringCompare } from "@util"

export class SpellPointBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: FeatureType.SpellPointBonus,
			match: "all_colleges",
			name: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
		})
	}

	matchForType(name: string, powerSource: string, colleges: string[]): boolean {
		switch (this.match) {
			case "all_colleges":
				return true
			case "spell_name":
				return stringCompare(name, this.name)
			case "college_name":
				return stringCompare(colleges, this.name)
			case "power_source_name":
				return stringCompare(powerSource, this.name)
		}
	}
}

export interface SpellPointBonus extends BaseFeature {
	match: SpellBonusMatch
	name?: StringCompare
	tags?: StringCompare
}
