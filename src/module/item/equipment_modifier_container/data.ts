import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { ItemType } from "@module/data"

export type EquipmentModifierContainerSource = ItemGCSSource<
	ItemType.EquipmentModifierContainer,
	EquipmentModifierContainerSystemData
>

export interface EquipmentModifierContainerData
	extends Omit<EquipmentModifierContainerSource, "effects" | "items">,
		EquipmentModifierContainerSystemData {
	readonly type: EquipmentModifierContainerSource["type"]
	data: EquipmentModifierContainerSystemData
	readonly _source: EquipmentModifierContainerSource
}

export type EquipmentModifierContainerSystemData = ItemGCSSystemData
