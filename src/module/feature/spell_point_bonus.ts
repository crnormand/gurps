import { BaseFeature } from "./base";
import { StringCompare, StringComparison } from "@module/data";
import { SpellBonusMatch } from "./spell_bonus";

export class SpellPointBonus extends BaseFeature {
	static get defaults(): Record<string, any> {
		return mergeObject(super.defaults, {
			type: "spell_point_bonus",
			match: "all_colleges",
			name: { compare: StringComparison.None, qualifier: "" },
			tags: { compare: StringComparison.None, qualifier: "" },
		});
	}

	get featureMapKey(): string {
		if (this.tags?.compare !== "none") {
			return "spell.points" + "*";
		}
		switch (this.match) {
			case "all_colleges":
				return "spell.college.points";
			case "college_name":
				return this.buildKey("spell.college.points");
			case "power_source_name":
				return this.buildKey("spell.power_source.points");
			case "spell_name":
				return this.buildKey("spell.points");
			default:
				console.error("Invalid match type: ", this.match);
				return "";
		}
	}

	buildKey(prefix: string): string {
		if (this.name?.compare === "is") {
			return `${prefix}/${this.name.qualifier}`;
		}
		return `${prefix}*`;
	}
}

export interface SpellPointBonus extends BaseFeature {
	match: SpellBonusMatch;
	name?: StringCompare;
	tags?: StringCompare;
}
