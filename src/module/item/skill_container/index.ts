import { ContainerGURPS } from "@item/container";
import { SkillGURPS } from "@item/skill";
import { TechniqueGURPS } from "@item/technique";
import { SkillContainerData } from "./data";

export class SkillContainerGURPS extends ContainerGURPS {
	// Static override get schema(): typeof SkillContainerData {
	// 	return SkillContainerData;
	// }

	// Embedded Items
	get children(): Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS> {
		return super.children as Collection<SkillGURPS | TechniqueGURPS | SkillContainerGURPS>;
	}
}

export interface SkillContainerGURPS {
	readonly system: SkillContainerData;
}
