import { EquipmentGURPS } from "./equipment";
import { EquipmentContainerGURPS } from "./equipment_container";
import { EquipmentModifierGURPS } from "./equipment_modifier";
import { EquipmentModifierContainerGURPS } from "./equipment_modifier_container";
import { NoteGURPS } from "./note";
import { NoteContainerGURPS } from "./note_container";
import { RitualMagicSpellGURPS } from "./ritual_magic_spell";
import { SkillGURPS } from "./skill";
import { SkillContainerGURPS } from "./skill_container";
import { SpellGURPS } from "./spell";
import { SpellContainerGURPS } from "./spell_container";
import { TechniqueGURPS } from "./technique";
import { TraitGURPS } from "./trait";
import { TraitContainerGURPS } from "./trait_container";
import { TraitModifierGURPS } from "./trait_modifier";
import { TraitModifierContainerGURPS } from "./trait_modifier_container";

export { BaseItemGURPS } from "./base";
export { ContainerGURPS } from "./container";

export type ItemGURPS =
	| TraitGURPS
	| TraitContainerGURPS
	| TraitModifierGURPS
	| TraitModifierContainerGURPS
	| SkillGURPS
	| TechniqueGURPS
	| SkillContainerGURPS
	| SpellGURPS
	| RitualMagicSpellGURPS
	| SpellContainerGURPS
	| EquipmentGURPS
	| EquipmentContainerGURPS
	| EquipmentModifierGURPS
	| EquipmentModifierContainerGURPS
	| NoteGURPS
	| NoteContainerGURPS;

export { EquipmentGURPS } from "./equipment";
export { EquipmentContainerGURPS } from "./equipment_container";
export { EquipmentModifierGURPS } from "./equipment_modifier";
export { NoteGURPS } from "./note";
export { NoteContainerGURPS } from "./note_container";
export { RitualMagicSpellGURPS } from "./ritual_magic_spell";
export { SkillGURPS } from "./skill";
export { SkillContainerGURPS } from "./skill_container";
export { SpellGURPS } from "./spell";
export { SpellContainerGURPS } from "./spell_container";
export { TechniqueGURPS } from "./technique";
export { TraitGURPS } from "./trait";
export { TraitContainerGURPS } from "./trait_container";
export { TraitModifierGURPS } from "./trait_modifier";
export { TraitModifierContainerGURPS } from "./trait_modifier_container";
export { EquipmentModifierContainerGURPS } from "./equipment_modifier_container";
