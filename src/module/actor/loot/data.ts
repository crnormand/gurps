import { ActorFlagsGURPS, ActorSystemData, BaseActorSourceGURPS } from "@actor/base"
import { ActorType, DisplayMode } from "@module/data"
import { WeightUnits } from "@util"

export interface LootSource extends BaseActorSourceGURPS<ActorType.Loot, LootSystemData> {
	flags: DeepPartial<LootFlags>
}
export interface LootDataGURPS extends Omit<LootSource, "effects" | "flags" | "items" | "token">, LootSystemData {
	readonly type: LootSource["type"]
	data: LootSystemData
	flags: LootFlags

	readonly _source: LootSource
}

export type LootFlags = ActorFlagsGURPS

export interface LootSystemData extends ActorSystemData {
	description: string
	import: { name: string; path: string; last_import: string }
	settings: LootSettings
	created_date: string
	modified_date: string
}

export interface LootSettings {
	default_weight_units: WeightUnits
	user_description_display: DisplayMode
	modifiers_display: DisplayMode
	notes_display: DisplayMode
	show_equipment_modifier_adj: boolean
}
