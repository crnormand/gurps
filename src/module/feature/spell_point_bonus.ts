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

	get featureMapKey(): string {
		if (this.tags?.compare !== "none") {
			return "spell.points*"
		}
		switch (this.match) {
			case "all_colleges":
				return "spell.college.points"
			case "college_name":
				return this.buildKey("spell.college.points")
			case "power_source_name":
				return this.buildKey("spell.power_source.points")
			case "spell_name":
				return this.buildKey("spell.points")
			default:
				console.error("Invalid match type: ", this.match)
				return ""
		}
	}

	buildKey(prefix: string): string {
		if (this.name?.compare === StringComparison.Is) {
			return `${prefix}/${this.name.qualifier}`
		}
		return `${prefix}*`
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
