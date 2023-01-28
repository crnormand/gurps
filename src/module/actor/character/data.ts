import { DamageProgression, DisplayMode } from "@module/data"
import { ActorFlagsGURPS, ActorSystemData, BaseActorSourceGURPS } from "@actor/base/data"
import { AttributeDefObj } from "@module/attribute/attribute_def"
import { Attribute, AttributeObj } from "@module/attribute"
import { ResourceTrackerObj } from "@module/resource_tracker"
import { ResourceTrackerDefObj } from "@module/resource_tracker/tracker_def"
import { Length, LengthUnits, Weight, WeightUnits } from "@util/measure"
import { HitLocationTableData } from "./hit_location"
import { ActorType } from "@actor/data"

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

type CharacterFlags = ActorFlagsGURPS & {
	gurps: {
		// Empty
	}
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
	pools: { [key: string]: Partial<Attribute> }
	third_party?: any
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
	height: Length
	weight: Weight
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
