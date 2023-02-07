import * as browserTabs from "./tabs"

export interface PackInfo {
	load: boolean
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
export type BrowserTab = InstanceType<typeof browserTabs[keyof typeof browserTabs]>
export type TabData<T> = Record<TabName, T | null>
