import { AttributePrereq } from "./attribute_prereq";
import { ContainedQuantityPrereq } from "./contained_quantity_prereq";
import { ContainedWeightPrereq } from "./contained_weight_prereq";
import { PrereqList } from "./prereq_list";
import { SkillPrereq } from "./skill_prereq";
import { SpellPrereq } from "./spell_prereq";
import { TraitPrereq } from "./trait_prereq";

export type PrereqType =
	| "prereq_list"
	| "trait_prereq"
	| "attribute_prereq"
	| "contained_quantity_prereq"
	| "contained_weight_prereq"
	| "skill_prereq"
	| "spell_prereq";

export type Prereq =
	| PrereqList
	| TraitPrereq
	| AttributePrereq
	| ContainedWeightPrereq
	| ContainedQuantityPrereq
	| SkillPrereq
	| SpellPrereq;

export const prereqClasses = {
	// Prereq_list: PrereqList,
	// trait_prereq: TraitPrereq,
	// attribute_prereq: AttributePrereq,
	// contained_quantity_prereq: ContainedQuantityPrereq,
	// contained_weight_prereq: ContainedWeightPrereq,
	// skill_prereq: SkillPrereq,
	// spell_prereq: SpellPrereq,
};

export { BasePrereq } from "./base";
export { AttributePrereq } from "./attribute_prereq";
export { ContainedQuantityPrereq } from "./contained_quantity_prereq";
export { ContainedWeightPrereq } from "./contained_weight_prereq";
export { PrereqList } from "./prereq_list";
export { SkillPrereq } from "./skill_prereq";
export { SpellPrereq } from "./spell_prereq";
export { TraitPrereq } from "./trait_prereq";
