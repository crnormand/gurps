import { ItemType } from "@item/data"
import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { Feature } from "@module/config"

export type TraitModifierSource = ItemGCSSource<ItemType.TraitModifier, TraitModifierSystemData>

// Export class TraitModifierData extends BaseItemDataGURPS<TraitModifierGURPS> {}

export interface TraitModifierData extends Omit<TraitModifierSource, "effects">, TraitModifierSystemData {
	readonly type: TraitModifierSource["type"]
	data: TraitModifierSystemData

	readonly _source: TraitModifierSource
}

export interface TraitModifierSystemData extends ItemGCSSystemData {
	disabled: boolean
	cost_type: TraitModifierCostType
	cost: number
	levels: number
	affects: TraitModifierAffects
	features: Feature[]
}

export type TraitModifierCostType = "percentage" | "points" | "multiplier"
export type TraitModifierAffects = "total" | "base_only" | "levels_only"
