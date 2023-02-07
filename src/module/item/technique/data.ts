import { ItemType } from "@item/data"
import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { EncumbrancePenaltyMultiplier } from "@item/skill"
import { Feature, Weapon } from "@module/config"
import { Study } from "@module/data"
import { SkillDefault } from "@module/default"
import { PrereqList } from "@prereq"

export type TechniqueSource = ItemGCSSource<ItemType.Technique, TechniqueSystemData>

// Export class TechniqueData extends BaseItemDataGURPS<TechniqueGURPS> {}

export interface TechniqueData extends Omit<TechniqueSource, "effects">, TechniqueSystemData {
	readonly type: TechniqueSource["type"]
	data: TechniqueSystemData

	readonly _source: TechniqueSource
}

export interface TechniqueSystemData extends ItemGCSSystemData {
	prereqs: PrereqList
	tech_level: string
	encumbrance_penalty_multiplier: EncumbrancePenaltyMultiplier
	// May change to object type
	difficulty: string
	points: number
	// To change later
	defaulted_from?: SkillDefault
	weapons: Weapon[]
	defaults: SkillDefault[]
	features: Feature[]
	// Calc: {
	// 	level: number;
	// 	rsl: string;
	// };
	default: SkillDefault
	limit: number
	limited: boolean
	study: Study[]
}
