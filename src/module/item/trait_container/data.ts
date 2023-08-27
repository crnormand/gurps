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
	cr: 0 | 6 | 9 | 12 | 15
	cr_adj: CRAdjustment
}

export enum TraitContainerType {
	Group = "group",
	MetaTrait = "meta_trait",
	Ancestry = "ancestry",
	AlternativeAbilities = "alternative_abilities",
}
