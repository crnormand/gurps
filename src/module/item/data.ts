import { ItemGURPS } from "@item";
import { SYSTEM_NAME } from "@module/settings";
import { EquipmentData, EquipmentSystemData } from "./equipment/data";
import { EquipmentContainerData, EquipmentContainerSystemData } from "./equipment_container/data";
import { EquipmentModifierData, EquipmentModifierSystemData } from "./equipment_modifier/data";
import {
	EquipmentModifierContainerData,
	EquipmentModifierContainerSystemData,
} from "./equipment_modifier_container/data";
import { NoteData, NoteSystemData } from "./note/data";
import { NoteContainerData, NoteContainerSystemData } from "./note_container/data";
import { RitualMagicSpellData, RitualMagicSpellSystemData } from "./ritual_magic_spell/data";
import { SkillData, SkillSystemData } from "./skill/data";
import { SkillContainerData, SkillContainerSystemData } from "./skill_container/data";
import { SpellData, SpellSystemData } from "./spell/data";
import { SpellContainerData, SpellContainerSystemData } from "./spell_container/data";
import { TechniqueData, TechniqueSystemData } from "./technique/data";
import { TraitData, TraitSystemData } from "./trait/data";
import { TraitContainerData, TraitContainerSystemData } from "./trait_container/data";
import { TraitModifierData, TraitModifierSystemData } from "./trait_modifier/data";
import { TraitModifierContainerData, TraitModifierContainerSystemData } from "./trait_modifier_container/data";

export type ItemDataGURPS =
	| TraitData
	| TraitContainerData
	| TraitModifierData
	| TraitModifierContainerData
	| SkillData
	| TechniqueData
	| SkillContainerData
	| SpellData
	| RitualMagicSpellData
	| SpellContainerData
	| EquipmentData
	| EquipmentContainerData
	| EquipmentModifierData
	| EquipmentModifierContainerData
	| NoteData
	| NoteContainerData;

export type ContainerDataGURPS =
	| TraitData
	| TraitContainerData
	| TraitModifierContainerData
	| SkillContainerData
	| SpellContainerData
	| EquipmentData
	| EquipmentContainerData
	| EquipmentModifierContainerData
	| NoteData
	| NoteContainerData;

export type ItemSystemDataGURPS =
	| TraitSystemData
	| TraitContainerSystemData
	| TraitModifierSystemData
	| TraitModifierContainerSystemData
	| SkillSystemData
	| TechniqueSystemData
	| SkillContainerSystemData
	| SpellSystemData
	| RitualMagicSpellSystemData
	| SpellContainerSystemData
	| EquipmentSystemData
	| EquipmentContainerSystemData
	| EquipmentModifierSystemData
	| EquipmentModifierContainerSystemData
	| NoteSystemData
	| NoteContainerSystemData;

export type ItemType =
	| "trait"
	| "trait_container"
	| "modifier"
	| "modifier_container"
	| "skill"
	| "technique"
	| "skill_container"
	| "spell"
	| "ritual_magic_spell"
	| "spell_container"
	| "equipment"
	| "equipment_container"
	| "eqp_modifier"
	| "eqp_modifier_container"
	| "note"
	| "note_container";

// Export type ContainerType =
// 	| "trait"
// 	| "trait_container"
// 	| "skill_container"
// 	| "spell_container"
// 	| "equipment"
// 	| "equipment_container"
// 	| "note_container";

export interface ItemFlagsGURPS extends Record<string, unknown> {
	[SYSTEM_NAME]?: {
		contentsData?: Array<ItemGURPS>;
	};
}

export interface BaseItemSystemData {
	id: string;
	name?: string;
	reference: string;
	notes: string;
	tags: Array<string>;
	type: ItemType;
}

export { EquipmentData } from "./equipment/data";
export { EquipmentContainerData } from "./equipment_container/data";
export { EquipmentModifierData } from "./equipment_modifier/data";
export { NoteData } from "./note/data";
export { NoteContainerData } from "./note_container/data";
export { RitualMagicSpellData } from "./ritual_magic_spell/data";
export { SkillData } from "./skill/data";
export { SkillContainerData } from "./skill_container/data";
export { SpellData } from "./spell/data";
export { TechniqueData } from "./technique/data";
export { TraitData } from "./trait/data";
export { TraitContainerData } from "./trait_container/data";
export { TraitModifierData } from "./trait_modifier/data";
