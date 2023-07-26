import { ActorType, DamageProgression, DisplayMode, MoveType, RollModifier, SYSTEM_NAME } from "@module/data"
import { ActorFlags, ActorFlagsGURPS, ActorSystemData, BaseActorSourceGURPS } from "@actor/base/data"
import { HitLocationTableData } from "./hit_location"
import { AttributeDefObj, AttributeObj, PoolThreshold } from "@module/attribute"
import { ResourceTrackerDefObj, ResourceTrackerObj } from "@module/resource_tracker"
import { LengthUnits, Weight, WeightUnits } from "@util"
import { DocumentModificationOptions } from "types/foundry/common/abstract/document.mjs"

export interface DocumentModificationOptionsGURPS extends DocumentModificationOptions {
	temporary: boolean
	substitutions: boolean
}

export interface CharacterSource extends BaseActorSourceGURPS<ActorType.Character, CharacterSystemData> {
	flags: DeepPartial<CharacterFlags>
}
export interface CharacterDataGURPS
	extends Omit<CharacterSource, "effects" | "flags" | "items" | "token">,
		CharacterSystemData {
	readonly type: CharacterSource["type"]
	data: CharacterSystemData
	flags: CharacterFlags

	readonly _source: CharacterSource
}

export interface CharacterFlags extends ActorFlagsGURPS {
	[SYSTEM_NAME]: {
		[ActorFlags.TargetModifiers]: RollModifier[]
		[ActorFlags.SelfModifiers]: RollModifier[]
		[ActorFlags.MoveType]: MoveType
		[ActorFlags.AutoEncumbrance]: { active: boolean; manual: number }
		[ActorFlags.AutoThreshold]: { active: boolean; manual: Record<string, PoolThreshold | null> }
	}
}

export const CharacterFlagDefaults: CharacterFlags = {
	[SYSTEM_NAME]: {
		[ActorFlags.TargetModifiers]: [],
		[ActorFlags.SelfModifiers]: [],
		[ActorFlags.MoveType]: MoveType.Ground,
		[ActorFlags.AutoEncumbrance]: { active: true, manual: 0 },
		[ActorFlags.AutoThreshold]: { active: true, manual: {} },
	},
}

export interface CharacterSystemData extends ActorSystemData {
	version: number
	move: CharacterMove
	import: { name: string; path: string; last_import: string }
	settings: CharacterSettings
	created_date: string
	modified_date: string
	profile: CharacterProfile
	attributes: AttributeObj[]
	resource_trackers: ResourceTrackerObj[]
	total_points: number
	points_record: PointsRecord[]
	calc: CharacterCalc
	editing: boolean
	// TODO: check if this fits
	pools: Record<string, any>
	third_party?: any
	move_type: "ground" | "air" | "water" | "space"
}

export interface CharacterMove {
	maneuver: string
	posture: string
	type: string
}

export interface CharacterSettings {
	default_length_units: LengthUnits
	default_weight_units: WeightUnits
	user_description_display: DisplayMode
	modifiers_display: DisplayMode
	notes_display: DisplayMode
	skill_level_adj_display: DisplayMode
	use_multiplicative_modifiers: boolean
	use_modifying_dice_plus_adds: boolean
	use_half_stat_defaults: boolean
	damage_progression: DamageProgression
	show_trait_modifier_adj: boolean
	show_equipment_modifier_adj: boolean
	show_spell_adj: boolean
	use_title_in_footer: boolean
	exclude_unspent_points_from_total: boolean
	page: {
		paper_size: string
		top_margin: string
		left_margin: string
		bottom_margin: string
		right_margin: string
		orientation: string
	}
	block_layout: Array<string>
	body_type: HitLocationTableData
	attributes: AttributeDefObj[]
	resource_trackers: ResourceTrackerDefObj[]
}

export interface CharacterProfile {
	player_name: string
	name: string
	title: string
	organization: string
	age: string
	birthday: string
	eyes: string
	hair: string
	skin: string
	handedness: string
	height: string
	weight: string
	SM: number
	gender: string
	tech_level: string
	religion: string
	portrait: string
}

export interface CharacterCalc {
	// Swing: RollGURPS;
	// thrust: RollGURPS;
	swing: string
	thrust: string
	basic_lift: Weight
	lifting_st_bonus: number
	striking_st_bonus: number
	throwing_st_bonus: number
	move: Array<number>
	dodge: Array<number>
	dodge_bonus: number
	block_bonus: number
	parry_bonus: number
}

export interface PointsRecord {
	when: string
	points: number
	reason: string
}

export interface Encumbrance {
	level: number
	maximum_carry: number
	penalty: number
	name: string
}

export const CharacterDefaultData: Partial<CharacterSystemData> = {
	profile: {
		player_name: "",
		name: "",
		title: "",
		organization: "",
		age: "",
		birthday: "",
		eyes: "",
		hair: "",
		skin: "",
		handedness: "",
		height: "6'",
		weight: "0 lb",
		SM: 0,
		gender: "",
		tech_level: "",
		religion: "",
		portrait: "",
	},
	editing: true,
	calc: {
		swing: "",
		thrust: "",
		basic_lift: 0,
		lifting_st_bonus: 0,
		striking_st_bonus: 0,
		throwing_st_bonus: 0,
		move: [0, 0, 0, 0, 0],
		dodge: [0, 0, 0, 0, 0],
		dodge_bonus: 0,
		block_bonus: 0,
		parry_bonus: 0,
	},
}
