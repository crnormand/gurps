import { Feature } from "@feature";
import { BaseItemSourceGURPS, ItemSystemData } from "@item/base/data";

export type EquipmentModifierSource = BaseItemSourceGURPS<"eqp_modifier", EquipmentModifierSystemData>;

// Export class EquipmentModifierData extends BaseItemDataGURPS<EquipmentModifierGURPS> {}

export interface EquipmentModifierData extends Omit<EquipmentModifierSource, "effects">, EquipmentModifierSystemData {
	readonly type: EquipmentModifierSource["type"];
	data: EquipmentModifierSystemData;

	readonly _source: EquipmentModifierSource;
}

export interface EquipmentModifierSystemData extends ItemSystemData {
	cost_type: EquipmentCostType;
	cost: string;
	weight_type: EquipmentWeightType;
	weight: string;
	tech_level: string;
	features: Feature[];
	disabled: boolean;
}

export type EquipmentCostType = "to_original_cost" | "to_base_cost" | "to_final_base_cost" | "to_final_cost";
export type EquipmentWeightType = "to_original_weight" | "to_base_weight" | "to_final_base_weight" | "to_final_weight";
