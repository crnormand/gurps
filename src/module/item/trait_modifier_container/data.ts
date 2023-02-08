import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data"
import { ItemType } from "@module/data"

export type TraitModifierContainerSource = BaseContainerSource<
	ItemType.TraitModifierContainer,
	TraitModifierContainerSystemData
>

// Export class TraitModifierContainerData extends BaseContainerData<TraitModifierContainerGURPS> {}

export interface TraitModifierContainerData
	extends Omit<TraitModifierContainerSource, "effects" | "items">,
		TraitModifierContainerSystemData {
	readonly type: TraitModifierContainerSource["type"]
	data: TraitModifierContainerSystemData
	readonly _source: TraitModifierContainerSource
}

export type TraitModifierContainerSystemData = BaseContainerSystemData
