import { Feature } from "@feature";
import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";
import { EncumbrancePenaltyMultiplier } from "@item/skill/data";
import { SkillDefault } from "@module/default";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type TechniqueSource = BaseItemSourceGURPS<"technique", TechniqueSystemData>;

// Export class TechniqueData extends BaseItemDataGURPS<TechniqueGURPS> {}

export interface TechniqueData extends Omit<TechniqueSource, "effects">, TechniqueSystemData {
	readonly type: TechniqueSource["type"];
	data: TechniqueSystemData;

	readonly _source: TechniqueSource;
}

export interface TechniqueSystemData extends ItemSystemData {
	prereqs: PrereqList;
	tech_level: string;
	encumbrance_penalty_multiplier: EncumbrancePenaltyMultiplier;
	// May change to object type
	difficulty: string;
	points: number;
	// To change later
	defaulted_from?: SkillDefault;
	weapons: Weapon[];
	defaults: SkillDefault[];
	features: Feature[];
	// Calc: {
	// 	level: number;
	// 	rsl: string;
	// };
	default: SkillDefault;
	limit: number;
	limited: boolean;
}
