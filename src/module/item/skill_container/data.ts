import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { ItemType } from "@module/data"

export type SkillContainerSource = ItemGCSSource<ItemType.SkillContainer, SkillContainerSystemData>

export interface SkillContainerData extends Omit<SkillContainerSource, "effects" | "items">, SkillContainerSystemData {
	readonly type: SkillContainerSource["type"]
	data: SkillContainerSystemData
	readonly _source: SkillContainerSource
}

export type SkillContainerSystemData = ItemGCSSystemData
