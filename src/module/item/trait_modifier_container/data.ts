import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { ItemType } from "@module/data"

export type TraitModifierContainerSource = ItemGCSSource<
	ItemType.TraitModifierContainer,
	TraitModifierContainerSystemData
>

export interface TraitModifierContainerData
	extends Omit<TraitModifierContainerSource, "effects" | "items">,
		TraitModifierContainerSystemData {
	readonly type: TraitModifierContainerSource["type"]
	readonly _source: TraitModifierContainerSource
}

export type TraitModifierContainerSystemData = ItemGCSSystemData
