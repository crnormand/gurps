import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";

export type EquipmentModifierContainerSource = BaseContainerSource<
	"eqp_modifier_container",
	EquipmentModifierContainerSystemData
>;

// Export class EquipmentModifierContainerData extends BaseContainerData<EquipmentModifierContainerGURPS> {}

export interface EquipmentModifierContainerData
	extends Omit<EquipmentModifierContainerSource, "effects" | "items">,
		EquipmentModifierContainerSystemData {
	readonly type: EquipmentModifierContainerSource["type"];
	data: EquipmentModifierContainerSystemData;
	readonly _source: EquipmentModifierContainerSource;
}

export type EquipmentModifierContainerSystemData = BaseContainerSystemData;
