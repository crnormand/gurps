import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { Feature } from "@module/config"
import { ItemType } from "@module/data"
import { PrereqList } from "@prereq"

export type EquipmentContainerSource = ItemGCSSource<ItemType.EquipmentContainer, EquipmentContainerSystemData>

export interface EquipmentContainerData
	extends Omit<EquipmentContainerSource, "effects" | "items">,
		EquipmentContainerSystemData {
	readonly type: EquipmentContainerSource["type"]
	data: EquipmentContainerSystemData

	readonly _source: EquipmentContainerSource
}

export interface EquipmentContainerSystemData extends ItemGCSSystemData {
	description: string
	prereqs: PrereqList
	equipped: boolean
	quantity: number
	tech_level: string
	legality_class: string
	value: number
	ignore_weight_for_skills: boolean
	weight: string
	uses: number
	max_uses: number
	features: Feature[]
	other: boolean
}
