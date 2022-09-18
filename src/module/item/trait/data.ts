import { Feature } from "@feature";
import { SkillBonus } from "@feature/skill_bonus";
import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";
import { CRAdjustment } from "@module/data";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type TraitSource = BaseContainerSource<"trait", TraitSystemData>;

// Export class TraitData extends BaseContainerData<TraitGURPS> {}

export interface TraitData extends Omit<TraitSource, "effects" | "items">, TraitSystemData {
	readonly type: TraitSource["type"];
	// Data: TraitSystemData;
	readonly _source: TraitSource;
}

export interface TraitSystemData extends BaseContainerSystemData {
	prereqs: PrereqList;
	round_down: boolean;
	disabled: boolean;
	// Mental: boolean;
	// physical: boolean;
	// social: boolean;
	// exotic: boolean;
	// supernatural: boolean;
	levels: number;
	base_points: number;
	points_per_level: number;
	// Calc: {
	// 	points: number;
	// };
	cr: number;
	cr_adj: CRAdjustment;
	features?: Feature[];
	weapons?: Weapon[];
}

const CR_Features = new Map();

CR_Features.set("major_cost_of_living_increase", [
	new SkillBonus(
		{
			selection_type: "skills_with_name",
			name: { compare: "is", qualifier: "Merchant" },
			specialization: { compare: "none" },
			tags: { compare: "none" },
		},
		{ ready: true }
	),
]);

export { CR_Features };
