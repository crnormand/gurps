import { CharacterProfile } from "@actor/character/data"
import { GURPS } from "@module/gurps"
import { DefaultAttributeSettings } from "./attributes"
import { ColorSettings } from "./colors"
import { DefaultHitLocationSettings } from "./hit_locations"
import { DefaultResourceTrackerSettings } from "./resource_trackers"
import { DefaultSheetSettings } from "./sheet_settings"

export const SYSTEM_NAME = "gcsga"
export enum SETTINGS {
	BASIC_SET_PDF = "basic_set_pdf",
	SERVER_SIDE_FILE_DIALOG = "server_side_file_dialog",
	PORTRAIT_OVERWRITE = "portrait_overwrite",
	COMPENDIUM_BROWSER_PACKS = "compendium_browser_packs",
	SHOW_TOKEN_MODIFIERS = "enable_token_modifier_window",
	IGNORE_IMPORT_NAME = "ignore_import_name",
	STATIC_IMPORT_HP_FP = "import_hp_fp",
	STATIC_IMPORT_BODY_PLAN = "import_bodyplan",
	STATIC_AUTOMATICALLY_SET_IGNOREQTY = "auto-ignore-qty",
	MODIFIER_MODE = "modifier_mode",
	COLORS = "colors",
	DEFAULT_ATTRIBUTES = "default_attributes",
	DEFAULT_RESOURCE_TRACKERS = "default_resource_trackers",
	DEFAULT_HIT_LOCATIONS = "default_hit_locations",
	DEFAULT_SHEET_SETTINGS = "default_sheet_settings",
}

/**
 *
 */
export function registerSettings(): void {
	// Register any custom system settings here
	const g = game as Game

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.COLORS, {
		name: "gurps.settings.colors.name",
		label: "gurps.settings.colors.label",
		hint: "gurps.settings.colors.hint",
		icon: "fas fa-palette",
		// @ts-ignore
		type: ColorSettings,
		restricted: false,
	})
	ColorSettings.registerSettings()

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.DEFAULT_ATTRIBUTES, {
		name: "gurps.settings.default_attributes.name",
		label: "gurps.settings.default_attributes.label",
		hint: "gurps.settings.default_attributes.hint",
		icon: "gcs-attribute",
		// @ts-ignore
		type: DefaultAttributeSettings,
		restricted: false,
	})
	DefaultAttributeSettings.registerSettings()

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.DEFAULT_RESOURCE_TRACKERS, {
		name: "gurps.settings.default_resource_trackers.name",
		label: "gurps.settings.default_resource_trackers.label",
		hint: "gurps.settings.default_resource_trackers.hint",
		icon: "gcs-coins",
		// @ts-ignore
		type: DefaultResourceTrackerSettings,
		restricted: true,
	})
	DefaultResourceTrackerSettings.registerSettings()

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.DEFAULT_HIT_LOCATIONS, {
		name: "gurps.settings.default_hit_locations.name",
		label: "gurps.settings.default_hit_locations.label",
		hint: "gurps.settings.default_hit_locations.hint",
		icon: "gcs-body-type",
		// @ts-ignore
		type: DefaultHitLocationSettings,
		restricted: true,
	})
	DefaultHitLocationSettings.registerSettings()

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.DEFAULT_SHEET_SETTINGS, {
		name: "gurps.settings.default_sheet_settings.name",
		label: "gurps.settings.default_sheet_settings.label",
		hint: "gurps.settings.default_sheet_settings.hint",
		icon: "gcs-settings",
		// @ts-ignore
		type: DefaultSheetSettings,
		restricted: true,
	})
	DefaultSheetSettings.registerSettings()

	g.settings.register(SYSTEM_NAME, SETTINGS.MODIFIER_MODE, {
		name: "gurps.settings.modifier_mode.name",
		hint: "gurps.settings.modifier_mode.hint",
		scope: "client",
		config: true,
		type: String,
		choices: {
			prompt: "gurps.settings.modifier_mode.choices.prompt",
			bucket: "gurps.settings.modifier_mode.choices.bucket",
		},
		default: "prompt",
		onChange: (value: string) => console.log(`Modifier Mode: ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.BASIC_SET_PDF, {
		name: "gurps.settings.basic_set_pdfs.name",
		hint: "gurps.settings.basic_set_pdfs.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			combined: "gurps.settings.basic_set_pdfs.choices.combined",
			separate: "gurps.settings.basic_set_pdfs.choices.separate",
		},
		default: "combined",
		onChange: (value: string) => console.log(`Basic Set PDFs : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.SERVER_SIDE_FILE_DIALOG, {
		name: "gurps.settings.server_side_file_dialog.name",
		hint: "gurps.settings.server_side_file_dialog.hint",
		scope: "client",
		config: true,
		type: Boolean,
		default: false,
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.PORTRAIT_OVERWRITE, {
		name: "gurps.settings.portrait_overwrite.name",
		hint: "gurps.settings.portrait_overwrite.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.COMPENDIUM_BROWSER_PACKS, {
		name: "placeholder",
		hint: "placeholder",
		default: "{}",
		type: Object,
		scope: "world",
		onChange: () => {
			GURPS.CompendiumBrowser.loadSettings()
		},
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_HP_FP, {
		name: "gurps.settings.import_hp_fp.name",
		hint: "gurps.settings.import_hp_fp.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			yes: "GURPS.settingImportHPAndFPUseFile",
			no: "GURPS.settingImportHPAndFPIgnore",
			ask: "GURPS.settingImportHPAndFPAsk",
		},
		default: "ask",
		onChange: (value: string) => console.log(`Basic Set PDFs : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_BODY_PLAN, {
		name: "gurps.settings.import_body_plan.name",
		hint: "gurps.settings.import_body_plan.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			yes: "GURPS.settingImportHPAndFPUseFile",
			no: "GURPS.settingImportHPAndFPIgnore",
			ask: "GURPS.settingImportHPAndFPAsk",
		},
		default: "ask",
		onChange: (value: string) => console.log(`Import of Body Plan : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.IGNORE_IMPORT_NAME, {
		name: "GURPS.settingImportIgnoreName",
		hint: "GURPS.settingHintImportIgnoreName",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		onChange: value => console.log(`Ignore import name : ${value}`),
	})
}

/**
 *
 */
function autoFillProfile(): CharacterProfile {
	const p: CharacterProfile | any = {}
	p.tech_level = "3"
	p.player_name = ""
	p.gender = "Male"
	p.age = "25"
	p.eyes = "Blue"
	p.hair = "Brown"
	p.skin = "Fair"
	p.handedness = "Right"
	p.height = "6'"
	p.weight = "180 lb"
	p.name = "John Doe"
	p.birthday = "January 1"
	return p
}

interface provider {
	general: {
		auto_fill: CharacterProfile
	}
}

export const SETTINGS_TEMP: provider = {
	general: {
		auto_fill: autoFillProfile(),
	},
}
