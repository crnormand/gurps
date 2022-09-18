import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type RitualMagicSpellSource = BaseItemSourceGURPS<"ritual_magic_spell", RitualMagicSpellSystemData>;

// Export class RitualMagicSpellData extends BaseItemDataGURPS<RitualMagicSpellGURPS> {}

export interface RitualMagicSpellData extends Omit<RitualMagicSpellSource, "effects">, RitualMagicSpellSystemData {
	readonly type: RitualMagicSpellSource["type"];
	data: RitualMagicSpellSystemData;

	readonly _source: RitualMagicSpellSource;
}

export interface RitualMagicSpellSystemData extends ItemSystemData {
	prereqs: PrereqList;
	difficulty: string;
	tech_level: string;
	college: Array<string>;
	power_source: string;
	spell_class: string;
	resist: string;
	casting_cost: string;
	maintenance_cost: string;
	casting_time: string;
	duration: string;
	points: number;
	weapons: Weapon[];
	// Calc: {
	// 	level: number;
	// 	rsl: string;
	// };
	base_skill: string;
	prereq_count: number;
}
