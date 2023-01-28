import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data"
import { ItemType } from "@item/data"

export type EquipmentModifierContainerSource = BaseContainerSource<
	ItemType.EquipmentModifierContainer,
	EquipmentModifierContainerSystemData
>

// Export class EquipmentModifierContainerData extends BaseContainerData<EquipmentModifierContainerGURPS> {}

export interface EquipmentModifierContainerData
	extends Omit<EquipmentModifierContainerSource, "effects" | "items">,
	EquipmentModifierContainerSystemData {
	readonly type: EquipmentModifierContainerSource["type"]
	data: EquipmentModifierContainerSystemData
	readonly _source: EquipmentModifierContainerSource
}

export type EquipmentModifierContainerSystemData = BaseContainerSystemData
