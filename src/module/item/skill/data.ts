import { Feature } from "@feature";
import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";
import { Difficulty } from "@module/data";
import { SkillDefault } from "@module/default";
import { TooltipGURPS } from "@module/tooltip";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type SkillSource = BaseItemSourceGURPS<"skill", SkillSystemData>;

// Export class SkillData extends BaseItemDataGURPS<SkillGURPS> {}

export interface SkillData extends Omit<SkillSource, "effects">, SkillSystemData {
	readonly type: SkillSource["type"];
	data: SkillSystemData;

	readonly _source: SkillSource;
}

export interface SkillSystemData extends ItemSystemData {
	prereqs: PrereqList;
	specialization: string;
	tech_level: string;
	// Should not be needed
	// TODO: find a way to remove
	tech_level_required: boolean;
	encumbrance_penalty_multiplier: EncumbrancePenaltyMultiplier;
	// May change to object type
	difficulty: `${string}/${string}`;
	points: number;
	// To change later
	defaulted_from?: SkillDefault;
	weapons: Weapon[];
	defaults: SkillDefault[];
	features: Feature[];
	// Calc: {
	// 	level: number;
	// 	rsl: string;
	// 	points: number;
	// };
}

export type EncumbrancePenaltyMultiplier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SkillLevel {
	level: number;
	relative_level: number;
	tooltip: TooltipGURPS | string;
}

/**
 *
 * @param d
 */
export function baseRelativeLevel(d: string): number {
	switch (d) {
		case Difficulty.Easy:
			return 0;
		case Difficulty.Average:
			return -1;
		case Difficulty.Hard:
			return -2;
		case Difficulty.VeryHard:
		case Difficulty.Wildcard:
			return -3;
		default:
			return baseRelativeLevel(Difficulty.Easy);
	}
}
