import { CharacterProfile } from "@actor/character/data"
import { AttributeDefObj, AttributeType } from "@module/attribute/attribute_def"
import { DamageProgression, DisplayMode } from "@module/data"
import { GURPS } from "@module/gurps"
import { ResourceTrackerDefObj } from "@module/resource_tracker/tracker_def"
import { LengthUnits, WeightUnits } from "@util/measure"
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

	g.settings.register(SYSTEM_NAME, SETTINGS.MODIFIER_MODE, {
		name: "gurps.settings.modifier_mode.name",
		hint: "gurps.settings.modifier_mode.hint",
		scope: "client",
		config: true,
		type: String,
		choices: {
			bucket: "gurps.settings.modifier_mode.choices.bucket",
			prompt: "gurps.settings.modifier_mode.choices.prompt",
		},
		default: "prompt",
		onChange: (value: string) => console.log(`Modifier Mode: ${value}`),
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
	sheet: {
		default_length_units: LengthUnits
		default_weight_units: WeightUnits
		user_description_display: DisplayMode
		modifiers_display: DisplayMode
		notes_display: DisplayMode
		skill_level_adj_display: DisplayMode
		use_multiplicative_modifiers: boolean
		use_modifying_dice_plus_adds: boolean
		damage_progression: DamageProgression
		use_simple_metric_conversions: boolean
		show_trait_modifier_adj: boolean
		show_equipment_modifier_adj: boolean
		show_spell_adj: boolean
		use_title_in_footer: boolean
		page: {
			paper_size: string
			top_margin: string
			left_margin: string
			bottom_margin: string
			right_margin: string
			orientation: string
		}
		block_layout: Array<string>
		attributes: AttributeDefObj[]
		resource_trackers: ResourceTrackerDefObj[]
		body_type: unknown
	}
	general: {
		initial_points: number
		auto_fill: CharacterProfile
	}
}

export const SETTINGS_TEMP: provider = {
	sheet: {
		default_length_units: LengthUnits.FeetAndInches,
		default_weight_units: WeightUnits.Pound,
		user_description_display: DisplayMode.Tooltip,
		modifiers_display: DisplayMode.Inline,
		notes_display: DisplayMode.Inline,
		skill_level_adj_display: DisplayMode.Tooltip,
		use_multiplicative_modifiers: false,
		use_modifying_dice_plus_adds: false,
		damage_progression: DamageProgression.BasicSet,
		use_simple_metric_conversions: true,
		show_trait_modifier_adj: false,
		show_equipment_modifier_adj: false,
		show_spell_adj: false,
		use_title_in_footer: false,
		page: {
			paper_size: "na-letter",
			top_margin: "0 in",
			left_margin: "0.25 in",
			bottom_margin: "0.25 in",
			right_margin: "0.25 in",
			orientation: "portrait",
		},
		block_layout: [
			"reactions conditional_modifiers",
			"melee",
			"ranged",
			"traits skills",
			"spells",
			"equipment",
			"other_equipment",
			"notes",
		],
		resource_trackers: [],
		attributes: [
			{
				id: "st",
				type: AttributeType.Integer,
				name: "ST",
				full_name: "Strength",
				attribute_base: "10",
				cost_per_point: 10,
				cost_adj_percent_per_sm: 10,
			},
			{
				id: "dx",
				type: AttributeType.Integer,
				name: "DX",
				full_name: "Dexterity",
				attribute_base: "10",
				cost_per_point: 20,
			},
			{
				id: "iq",
				type: AttributeType.Integer,
				name: "IQ",
				full_name: "Intelligence",
				attribute_base: "10",
				cost_per_point: 20,
			},
			{
				id: "ht",
				type: AttributeType.Integer,
				name: "HT",
				full_name: "Health",
				attribute_base: "10",
				cost_per_point: 10,
			},
			{
				id: "will",
				type: AttributeType.Integer,
				name: "Will",
				attribute_base: "$iq",
				cost_per_point: 5,
			},
			{
				id: "fright_check",
				type: AttributeType.Integer,
				name: "Fright Check",
				attribute_base: "$will",
				cost_per_point: 2,
			},
			{
				id: "per",
				type: AttributeType.Integer,
				name: "Per",
				full_name: "Perception",
				attribute_base: "$iq",
				cost_per_point: 5,
			},
			{
				id: "vision",
				type: AttributeType.Integer,
				name: "Vision",
				attribute_base: "$per",
				cost_per_point: 2,
			},
			{
				id: "hearing",
				type: AttributeType.Integer,
				name: "Hearing",
				attribute_base: "$per",
				cost_per_point: 2,
			},
			{
				id: "taste_smell",
				type: AttributeType.Integer,
				name: "Taste \u0026 Smell",
				attribute_base: "$per",
				cost_per_point: 2,
			},
			{
				id: "touch",
				type: AttributeType.Integer,
				name: "Touch",
				attribute_base: "$per",
				cost_per_point: 2,
			},
			{
				id: "basic_speed",
				type: AttributeType.Decimal,
				name: "Basic Speed",
				attribute_base: "($dx+$ht)/4",
				cost_per_point: 20,
			},
			{
				id: "basic_move",
				type: AttributeType.Integer,
				name: "Basic Move",
				attribute_base: "floor($basic_speed)",
				cost_per_point: 5,
			},
			{
				id: "fp",
				type: AttributeType.Pool,
				name: "FP",
				full_name: "Fatigue Points",
				attribute_base: "$ht",
				cost_per_point: 3,
				thresholds: [
					{
						state: "Unconscious",
						expression: "-$fp",
						ops: ["halve_move", "halve_dodge", "halve_st"],
					},
					{
						state: "Collapse",
						explanation:
							"Roll vs. Will to do anything besides talk or rest; failure causes unconsciousness\nEach FP you lose below 0 also causes 1 HP of injury\nMove, Dodge and ST are halved (B426)",
						expression: "0",
						ops: ["halve_move", "halve_dodge", "halve_st"],
					},
					{
						state: "Tired",
						explanation: "Move, Dodge and ST are halved (B426)",
						expression: "round($fp/3)",
						ops: ["halve_move", "halve_dodge", "halve_st"],
					},
					{
						state: "Tiring",
						expression: "$fp-1",
					},
					{
						state: "Rested",
						expression: "$fp",
					},
				],
			},
			{
				id: "hp",
				type: AttributeType.Pool,
				name: "HP",
				full_name: "Hit Points",
				attribute_base: "$st",
				cost_per_point: 2,
				cost_adj_percent_per_sm: 10,
				thresholds: [
					{
						state: "Dead",
						expression: "round(-$hp*5)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Dying #4",
						explanation:
							"Roll vs. HT to avoid death\nRoll vs. HT-4 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
						expression: "round(-$hp*4)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Dying #3",
						explanation:
							"Roll vs. HT to avoid death\nRoll vs. HT-3 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
						expression: "round(-$hp*3)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Dying #2",
						explanation:
							"Roll vs. HT to avoid death\nRoll vs. HT-2 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
						expression: "round(-$hp*2)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Dying #1",
						explanation:
							"Roll vs. HT to avoid death\nRoll vs. HT-1 every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
						expression: "-$hp",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Collapse",
						explanation:
							"Roll vs. HT every second to avoid falling unconscious\nMove and Dodge are halved (B419)",
						expression: "round($hp/3)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Reeling",
						explanation: "Move and Dodge are halved (B419)",
						expression: "round($hp/3)",
						ops: ["halve_move", "halve_dodge"],
					},
					{
						state: "Wounded",
						expression: "$hp-1",
					},
					{
						state: "Healthy",
						expression: "$hp",
					},
				],
			},
		],
		body_type: {
			name: "Humanoid",
			roll: "3d",
			locations: [
				{
					id: "eye",
					choice_name: "Eyes",
					table_name: "Eyes",
					slots: 0,
					hit_penalty: -9,
					dr_bonus: 0,
					description:
						"An attack that misses by 1 hits the torso instead. Only impaling (imp), piercing (pi-, pi, pi+, pi++), and tight-beam burning (burn) attacks can target the eye – and only from the front or sides. Injury over HP÷10 blinds the eye. Otherwise, treat as skull, but without the extra DR!",
					calc: {
						roll_range: "-",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "skull",
					choice_name: "Skull",
					table_name: "Skull",
					slots: 2,
					hit_penalty: -7,
					dr_bonus: 2,
					description:
						"An attack that misses by 1 hits the torso instead. Wounding modifier is x4. Knockdown rolls are at -10. Critical hits use the Critical Head Blow Table (B556). Exception: These special effects do not apply to toxic (tox) damage.",
					calc: {
						roll_range: "3-4",
						dr: {
							all: 2,
						},
					},
				},
				{
					id: "face",
					choice_name: "Face",
					table_name: "Face",
					slots: 1,
					hit_penalty: -5,
					dr_bonus: 0,
					description:
						"An attack that misses by 1 hits the torso instead. Jaw, cheeks, nose, ears, etc. If the target has an open-faced helmet, ignore its DR. Knockdown rolls are at -5. Critical hits use the Critical Head Blow Table (B556). Corrosion (cor) damage gets a x1½ wounding modifier, and if it inflicts a major wound, it also blinds one eye (both eyes on damage over full HP). Random attacks from behind hit the skull instead.",
					calc: {
						roll_range: "5",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "leg",
					choice_name: "Leg",
					table_name: "Right Leg",
					slots: 2,
					hit_penalty: -2,
					dr_bonus: 0,
					description:
						"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost.",
					calc: {
						roll_range: "6-7",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "arm",
					choice_name: "Arm",
					table_name: "Right Arm",
					slots: 1,
					hit_penalty: -2,
					dr_bonus: 0,
					description:
						"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost. If holding a shield, double the penalty to hit: -4 for shield arm instead of -2.",
					calc: {
						roll_range: "8",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "torso",
					choice_name: "Torso",
					table_name: "Torso",
					slots: 2,
					hit_penalty: 0,
					dr_bonus: 0,
					description: "",
					calc: {
						roll_range: "9-10",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "groin",
					choice_name: "Groin",
					table_name: "Groin",
					slots: 1,
					hit_penalty: -3,
					dr_bonus: 0,
					description:
						"An attack that misses by 1 hits the torso instead. Human males and the males of similar species suffer double shock from crushing (cr) damage, and get -5 to knockdown rolls. Otherwise, treat as a torso hit.",
					calc: {
						roll_range: "11",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "arm",
					choice_name: "Arm",
					table_name: "Left Arm",
					slots: 1,
					hit_penalty: -2,
					dr_bonus: 0,
					description:
						"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost. If holding a shield, double the penalty to hit: -4 for shield arm instead of -2.",
					calc: {
						roll_range: "12",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "leg",
					choice_name: "Leg",
					table_name: "Left Leg",
					slots: 2,
					hit_penalty: -2,
					dr_bonus: 0,
					description:
						"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ½ HP from one blow) cripples the limb. Damage beyond that threshold is lost.",
					calc: {
						roll_range: "13-14",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "hand",
					choice_name: "Hand",
					table_name: "Hand",
					slots: 1,
					hit_penalty: -4,
					dr_bonus: 0,
					description:
						"If holding a shield, double the penalty to hit: -8 for shield hand instead of -4. Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ⅓ HP from one blow) cripples the extremity. Damage beyond that threshold is lost.",
					calc: {
						roll_range: "15",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "foot",
					choice_name: "Foot",
					table_name: "Foot",
					slots: 1,
					hit_penalty: -4,
					dr_bonus: 0,
					description:
						"Reduce the wounding multiplier of large piercing (pi+), huge piercing (pi++), and impaling (imp) damage to x1. Any major wound (loss of over ⅓ HP from one blow) cripples the extremity. Damage beyond that threshold is lost.",
					calc: {
						roll_range: "16",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "neck",
					choice_name: "Neck",
					table_name: "Neck",
					slots: 2,
					hit_penalty: -5,
					dr_bonus: 0,
					description:
						"An attack that misses by 1 hits the torso instead. Neck and throat. Increase the wounding multiplier of crushing (cr) and corrosion (cor) attacks to x1½, and that of cutting (cut) damage to x2. At the GM’s option, anyone killed by a cutting (cut) blow to the neck is decapitated!",
					calc: {
						roll_range: "17-18",
						dr: {
							all: 0,
						},
					},
				},
				{
					id: "vitals",
					choice_name: "Vitals",
					table_name: "Vitals",
					slots: 0,
					hit_penalty: -3,
					dr_bonus: 0,
					description:
						"An attack that misses by 1 hits the torso instead. Heart, lungs, kidneys, etc. Increase the wounding modifier for an impaling (imp) or any piercing (pi-, pi, pi+, pi++) attack to x3. Increase the wounding modifier for a tight-beam burning (burn) attack to x2. Other attacks cannot target the vitals.",
					calc: {
						roll_range: "-",
						dr: {
							all: 0,
						},
					},
				},
			],
		},
	},
	general: {
		initial_points: 250,
		auto_fill: autoFillProfile(),
	},
}
