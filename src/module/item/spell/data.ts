import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type SpellSource = BaseItemSourceGURPS<"spell", SpellSystemData>;

// Export class SpellData extends BaseItemDataGURPS<SpellGURPS> {}

export interface SpellData extends Omit<SpellSource, "effects">, SpellSystemData {
	readonly type: SpellSource["type"];
	data: SpellSystemData;

	readonly _source: SpellSource;
}

export interface SpellSystemData extends ItemSystemData {
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
	// 	points: number;
	// };
}
