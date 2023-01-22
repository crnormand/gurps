import { CharacterProfile } from "@actor/character/data"
import { SETTINGS, SYSTEM_NAME } from "@module/data"
import { DefaultAttributeSettings } from "./attributes"
import { ColorSettings } from "./colors"
import { DefaultHitLocationSettings } from "./hit_locations"
import { DefaultResourceTrackerSettings } from "./resource_trackers"
import { RollModifierSettings } from "./roll_modifiers"
import { DefaultSheetSettings } from "./sheet_settings"

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

	g.settings.registerMenu(SYSTEM_NAME, SETTINGS.ROLL_MODIFIERS, {
		name: "gurps.settings.roll_modifiers.name",
		label: "gurps.settings.roll_modifiers.label",
		hint: "gurps.settings.roll_modifiers.hint",
		icon: "fas fa-plus-minus",
		// @ts-ignore
		type: RollModifierSettings,
		restricted: false,
	})
	RollModifierSettings.registerSettings()

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
		default: "bucket",
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

	g.settings.register(SYSTEM_NAME, SETTINGS.SHOW_IMPORT_BUTTON, {
		name: "gurps.settings.show_import_button.name",
		hint: "gurps.settings.show_import_button.hint",
		scope: "client",
		config: true,
		type: Boolean,
		default: true,
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
			;(game as any).CompendiumBrowser.loadSettings()
		},
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.SSRT, {
		name: "gurps.settings.ssrt.name",
		hint: "gurps.settings.ssrt.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			standard: "gurps.settings.ssrt.choices.standard",
			simplified: "gurps.settings.ssrt.choices.simplified",
			tens: "gurps.settings.ssrt.choices.tens",
		},
		default: "standard",
		onChange: (value: string) => console.log(`Range Modifier Formula : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_HP_FP, {
		name: "gurps.settings.import_hp_fp.name",
		hint: "gurps.settings.import_hp_fp.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			yes: "gurps.settings.import_hp_fp.choices.yes",
			no: "gurps.settings.import_hp_fp.choices.no",
			ask: "gurps.settings.import_hp_fp.choices.ask",
		},
		default: "ask",
		onChange: (value: string) => console.log(`Import HP & FP : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.STATIC_IMPORT_BODY_PLAN, {
		name: "gurps.settings.import_body_plan.name",
		hint: "gurps.settings.import_body_plan.hint",
		scope: "world",
		config: true,
		type: String,
		choices: {
			yes: "gurps.settings.import_body_plan.choices.yes",
			no: "gurps.settings.import_body_plan.choices.no",
			ask: "gurps.settings.import_body_plan.choices.ask",
		},
		default: "ask",
		onChange: (value: string) => console.log(`Import Body Plan : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.IGNORE_IMPORT_NAME, {
		name: "GURPS.settings.import_name.name",
		hint: "GURPS.settings.import_name.name",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		onChange: value => console.log(`Import Name : ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.DEFAULT_DAMAGE_LOCATION, {
		name: "gurps.settings.default_damage_location.name",
		hint: "gurps.settings.default_damage_location.hint",
		scope: "world",
		config: true,
		type: String,
		// @ts-ignore
		choices: {
			torso: "gurps.static.hit_location.Torso",
			Random: "gurps.static.hit_location.Random",
		},
		default: "torso",
		onChange: value => console.log(`Default damage location: ${value}`),
	})

	g.settings.register(SYSTEM_NAME, SETTINGS.DISPLAY_DICE, {
		name: "gurps.settings.display_dice.name",
		hint: "gurps.settings.display_dice.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		// OnChange: value => applyDiceCSS(value)
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

// Export function applyDiceCSS(value?: Boolean) {
// 	value ??= (game as Game).settings.get(SYSTEM_NAME, SETTINGS.DISPLAY_DICE) as Boolean
// 	if (value) $("[class^='fas dice-']").removeClass("num")
// 	else $("[class^='fas dice-']").addClass("num")
// }

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
