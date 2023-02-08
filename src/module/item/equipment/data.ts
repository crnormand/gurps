import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { Feature } from "@module/config"
import { ItemType } from "@module/data"
import { PrereqList } from "@prereq"

export type EquipmentSource = ItemGCSSource<ItemType.Equipment, EquipmentSystemData>

export type CostValueType = "addition" | "percentage" | "multiplier"

export interface EquipmentData extends Omit<EquipmentSource, "effects" | "items">, EquipmentSystemData {
	readonly type: EquipmentSource["type"]
	data: EquipmentSystemData

	readonly _source: EquipmentSource
}

export interface EquipmentSystemData extends Omit<ItemGCSSystemData, "open"> {
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
