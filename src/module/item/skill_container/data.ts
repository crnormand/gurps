import { BaseContainerSource, BaseContainerSystemData } from "@item/container/data";

export type SkillContainerSource = BaseContainerSource<"skill_container", SkillContainerSystemData>;

// Export class SkillContainerData extends BaseContainerData<SkillContainerGURPS> {}

export interface SkillContainerData extends Omit<SkillContainerSource, "effects" | "items">, SkillContainerSystemData {
	readonly type: SkillContainerSource["type"];
	data: SkillContainerSystemData;
	readonly _source: SkillContainerSource;
}

export type SkillContainerSystemData = BaseContainerSystemData;
