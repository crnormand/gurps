import { SkillBonus } from "@feature/skill_bonus"
import { ItemGCSSource, ItemGCSSystemData } from "@item/gcs"
import { Feature } from "@module/config"
import { CRAdjustment, ItemType, Study, StudyHoursNeeded } from "@module/data"
import { PrereqList } from "@prereq"

export type TraitSource = ItemGCSSource<ItemType.Trait, TraitSystemData>

export interface TraitData extends Omit<TraitSource, "effects" | "items">, TraitSystemData {
	readonly type: TraitSource["type"]
	readonly _source: TraitSource
}

export interface TraitSystemData extends ItemGCSSystemData {
	prereqs: PrereqList
	round_down: boolean
	disabled: boolean
	levels: number
	can_level: boolean
	base_points: number
	points_per_level: number
	cr: number
	cr_adj: CRAdjustment
	features?: Feature[]
	study: Study[]
	study_hours_needed: StudyHoursNeeded
	userdesc: string
}

const CR_Features = new Map()

CR_Features.set("major_cost_of_living_increase", [
	new SkillBonus(
		{
			selection_type: "skills_with_name",
			name: { compare: "is", qualifier: "Merchant" },
			specialization: { compare: "none" },
			tags: { compare: "none" },
		},
		{ ready: true }
	),
])

export { CR_Features }
