import { ImagePath } from "@module/data"
import * as browserTabs from "./tabs"

export interface PackInfo {
	load: boolean
	skillDefault?: boolean
	name: string
}

// Export type TabName = "trait" | "modifier" | "skill" | "spell" | "equipment" | "eqp_modifier" | "note" | "settings"
export enum TabName {
	Trait = "trait",
	TraitModifier = "modifier",
	Skill = "skill",
	Spell = "spell",
	Equipment = "equipment",
	EquipmentModifier = "eqp_modifier",
	Note = "note",
	Settings = "settings",
}

export type ItemTabName =
	| TabName.Trait
	| TabName.TraitModifier
	| TabName.Skill
	| TabName.Spell
	| TabName.Equipment
	| TabName.EquipmentModifier
	| TabName.Note
export type BrowserTab = InstanceType<(typeof browserTabs)[keyof typeof browserTabs]>
export type TabData<T> = Record<TabName, T | null>

export interface CompendiumIndexData {
	_id: string
	type: string
	name: string
	img: ImagePath
	// Img?: string | null;
	[key: string]: any
}

export type CompendiumIndex = Collection<CompendiumIndexData>
