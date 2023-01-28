import { AttributePrereq } from "./attribute_prereq"
import { ContainedQuantityPrereq } from "./contained_quantity_prereq"
import { ContainedWeightPrereq } from "./contained_weight_prereq"
import { EquippedEquipmentPrereq } from "./equipped_equipment_prereq"
import { PrereqList } from "./prereq_list"
import { SkillPrereq } from "./skill_prereq"
import { SpellPrereq } from "./spell_prereq"
import { TraitPrereq } from "./trait_prereq"

export enum PrereqType {
	List = "prereq_list",
	Trait = "trait_prereq",
	Attribute = "attribute_prereq",
	ContainedQuantity = "contained_quantity_prereq",
	ContainedWeight = "contained_weight_prereq",
	Skill = "skill_prereq",
	Spell = "spell_prereq",
	Equipment = "equipped_equipment_prereq",
}

export type Prereq =
	| PrereqList
	| TraitPrereq
	| AttributePrereq
	| ContainedWeightPrereq
	| ContainedQuantityPrereq
	| SkillPrereq
	| SpellPrereq
	| EquippedEquipmentPrereq

export const prereqClasses = {
	// Prereq_list: PrereqList,
	// trait_prereq: TraitPrereq,
	// attribute_prereq: AttributePrereq,
	// contained_quantity_prereq: ContainedQuantityPrereq,
	// contained_weight_prereq: ContainedWeightPrereq,
	// skill_prereq: SkillPrereq,
	// spell_prereq: SpellPrereq,
}

export { BasePrereq } from "./base"
export { AttributePrereq } from "./attribute_prereq"
export { ContainedQuantityPrereq } from "./contained_quantity_prereq"
export { ContainedWeightPrereq } from "./contained_weight_prereq"
export { EquippedEquipmentPrereq } from "./equipped_equipment_prereq"
export { PrereqList } from "./prereq_list"
export { SkillPrereq } from "./skill_prereq"
export { SpellPrereq } from "./spell_prereq"
export { TraitPrereq } from "./trait_prereq"
