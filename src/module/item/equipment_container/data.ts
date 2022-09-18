import { Feature } from "@feature";
import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";
import { Weapon } from "@module/weapon";
import { PrereqList } from "@prereq";

export type EquipmentContainerSource = BaseContainerSource<"equipment_container", EquipmentContainerSystemData>;

// Export class EquipmentContainerData extends BaseContainerData<EquipmentContainerGURPS> {}

export interface EquipmentContainerData
	extends Omit<EquipmentContainerSource, "effects" | "items">,
		EquipmentContainerSystemData {
	readonly type: EquipmentContainerSource["type"];
	data: EquipmentContainerSystemData;

	readonly _source: EquipmentContainerSource;
}

export interface EquipmentContainerSystemData extends BaseContainerSystemData {
	description: string;
	prereqs: PrereqList;
	equipped: boolean;
	quantity: number;
	tech_level: string;
	legality_class: string;
	value: number;
	ignore_weight_for_skills: boolean;
	weight: string;
	uses: number;
	max_uses: number;
	weapons: Weapon[];
	features: Feature[];
	// Calc: {
	// 	extended_value: string;
	// 	extended_weight: string;
	// 	extended_weight_for_skills: string;
	// };
	// modifiers: Array<any>;
	other: boolean;
}
