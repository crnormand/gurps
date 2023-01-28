import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data"
import { ItemType } from "@item/data"

export type SkillContainerSource = BaseContainerSource<ItemType.SkillContainer, SkillContainerSystemData>

// Export class SkillContainerData extends BaseContainerData<SkillContainerGURPS> {}

export interface SkillContainerData extends Omit<SkillContainerSource, "effects" | "items">, SkillContainerSystemData {
	readonly type: SkillContainerSource["type"]
	data: SkillContainerSystemData
	readonly _source: SkillContainerSource
}

export type SkillContainerSystemData = BaseContainerSystemData
