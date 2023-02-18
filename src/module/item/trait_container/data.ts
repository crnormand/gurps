import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { CRAdjustment, ItemType } from "@module/data"

export type TraitContainerSource = ItemGCSSource<ItemType.TraitContainer, TraitContainerSystemData>

export interface TraitContainerData extends Omit<TraitContainerSource, "effects" | "items">, TraitContainerSystemData {
	readonly type: TraitContainerSource["type"]
	data: TraitContainerSystemData
	readonly _source: TraitContainerSource
}

export interface TraitContainerSystemData extends ItemGCSSystemData {
	disabled: boolean
	container_type: TraitContainerType
	cr: number
	cr_adj: CRAdjustment
}

export type TraitContainerType = "group" | "meta_trait" | "race" | "alternative_abilities"
