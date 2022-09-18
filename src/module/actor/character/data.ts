import { DamageProgression, DisplayMode, Height, LengthUnits, Weight, WeightUnits } from "@module/data";
import { ActorFlagsGURPS, ActorSystemData, ActorType, BaseActorSourceGURPS } from "@actor/base/data";
import { AttributeDef, AttributeDefObj } from "@module/attribute/attribute_def";
import { Attribute, AttributeObj } from "@module/attribute";
import { DiceGURPS } from "@module/dice";

export interface CharacterSource extends BaseActorSourceGURPS<ActorType.CharacterGCS, CharacterSystemData> {
	flags: DeepPartial<CharacterFlags>;
}
export interface CharacterDataGURPS
	extends Omit<CharacterSource, "effects" | "flags" | "items" | "token">,
		CharacterSystemData {
	readonly type: CharacterSource["type"];
	data: CharacterSystemData;
	flags: CharacterFlags;

	readonly _source: CharacterSource;
}

type CharacterFlags = ActorFlagsGURPS & {
	gurps: {
		// Empty
	};
};

export interface CharacterSystemData extends ActorSystemData {
	version: number;
	// Import: CharacterImportData;
	import: { name: string; path: string; last_import: string };
	settings: CharacterSettings;
	created_date: string;
	modified_date: string;
	profile: CharacterProfile;
	attributes: Record<string, Attribute | AttributeObj>;
	total_points: number;
	calc: CharacterCalc;
	editing: boolean;
	// TODO: check if this fits
	pools: { [key: string]: Partial<Attribute> };
}

export interface CharacterSettings {
	default_length_units: LengthUnits;
	default_weight_units: WeightUnits;
	user_description_display: DisplayMode;
	modifiers_display: DisplayMode;
	notes_display: DisplayMode;
	skill_level_adj_display: DisplayMode;
	use_multiplicative_modifiers: boolean;
	use_modifying_dice_plus_adds: boolean;
	damage_progression: DamageProgression;
	use_simple_metric_conversions: boolean;
	show_difficulty: boolean;
	show_trait_modifier_adj: boolean;
	show_equipment_modifier_adj: boolean;
	show_spell_adj: boolean;
	use_title_in_footer: boolean;
	page: {
		paper_size: string;
		top_margin: string;
		left_margin: string;
		bottom_margin: string;
		right_margin: string;
		orientation: string;
	};
	block_layout: Array<string>;
	// Attributes: Record<string, AttributeSettingDef>;
	body_type: HitLocationTable;
	attributes: Record<string, AttributeDef | AttributeDefObj>; // AttributeObj represents the attribute as an object
}

export interface CharacterProfile {
	player_name: string;
	name: string;
	title: string;
	organization: string;
	age: string;
	birthday: string;
	eyes: string;
	hair: string;
	skin: string;
	handedness: string;
	height: Height;
	weight: Weight;
	SM: number;
	gender: string;
	tech_level: string;
	religion: string;
	portrait: string;
}

export interface CharacterCalc {
	// Swing: RollGURPS;
	// thrust: RollGURPS;
	swing: string;
	thrust: string;
	basic_lift: Weight;
	lifting_st_bonus: number;
	striking_st_bonus: number;
	throwing_st_bonus: number;
	move: Array<number>;
	dodge: Array<number>;
	dodge_bonus: number;
	block_bonus: number;
	parry_bonus: number;
}

export interface Encumbrance {
	level: number;
	maximum_carry: number;
	penalty: number;
	name: string;
}

export interface HitLocationTable {
	name: string;
	roll: DiceGURPS;
	locations: HitLocation[];
}

export interface HitLocation {
	id: string;
	choice_name: string;
	table_name: string;
	slots: number;
	hit_penalty: number;
	dr_bonus: number;
	description: string;
	sub_table?: HitLocationTable;
}
