import { CharacterGURPS } from "@actor/character"
import { StaticCharacterGURPS } from "@actor/static_character"
import { AttributeBonus } from "@feature/attribute_bonus"
import { ConditionalModifier } from "@feature/conditional_modifier"
import { ContainedWeightReduction } from "@feature/contained_weight_reduction"
import { CostReduction } from "@feature/cost_reduction"
import { DRBonus } from "@feature/dr_bonus"
import { ReactionBonus } from "@feature/reaction_bonus"
import { SkillBonus } from "@feature/skill_bonus"
import { SkillPointBonus } from "@feature/skill_point_bonus"
import { SpellBonus } from "@feature/spell_bonus"
import { SpellPointBonus } from "@feature/spell_point_bonus"
import { WeaponDamageBonus } from "@feature/weapon_bonus"
import { WeaponDRDivisorBonus } from "@feature/weapon_dr_divisor_bonus"
import {
	BaseItemGURPS,
	ContainerGURPS,
	EquipmentContainerGURPS,
	EquipmentGURPS,
	EquipmentModifierContainerGURPS,
	EquipmentModifierGURPS,
	NoteContainerGURPS,
	NoteGURPS,
	RitualMagicSpellGURPS,
	SkillContainerGURPS,
	SkillGURPS,
	SpellContainerGURPS,
	SpellGURPS,
	TechniqueGURPS,
	TraitContainerGURPS,
	TraitGURPS,
	TraitModifierContainerGURPS,
	TraitModifierGURPS,
} from "@item"
import { StaticItemGURPS } from "@item/static"
import { AttributePrereq } from "@prereq/attribute_prereq"
import { ContainedQuantityPrereq } from "@prereq/contained_quantity_prereq"
import { ContainedWeightPrereq } from "@prereq/contained_weight_prereq"
import { PrereqList } from "@prereq/prereq_list"
import { SkillPrereq } from "@prereq/skill_prereq"
import { SpellPrereq } from "@prereq/spell_prereq"
import { TraitPrereq } from "@prereq/trait_prereq"
import { rollModifiers, StudyType } from "./data"
import { MeleeWeapon, RangedWeapon } from "./weapon"

// Const GURPSCONFIG: any = CONFIG;
const GURPSCONFIG: any = {
	modifiers: rollModifiers,
	Item: {
		documentClasses: {
			base: BaseItemGURPS,
			container: ContainerGURPS,
			trait: TraitGURPS,
			trait_container: TraitContainerGURPS,
			modifier: TraitModifierGURPS,
			modifier_container: TraitModifierContainerGURPS,
			skill: SkillGURPS,
			technique: TechniqueGURPS,
			skill_container: SkillContainerGURPS,
			spell: SpellGURPS,
			ritual_magic_spell: RitualMagicSpellGURPS,
			spell_container: SpellContainerGURPS,
			equipment: EquipmentGURPS,
			equipment_container: EquipmentContainerGURPS,
			eqp_modifier: EquipmentModifierGURPS,
			eqp_modifier_container: EquipmentModifierContainerGURPS,
			note: NoteGURPS,
			note_container: NoteContainerGURPS,
			static_equipment: StaticItemGURPS,
		},
		allowedContents: {
			trait: ["modifier", "modifier_container"],
			trait_container: ["modifier", "modifier_container", "trait", "trait_container"],
			modifier_container: ["modifier", "modifier_container"],
			skill_container: ["skill", "technique", "skill_container"],
			spell_container: ["spell", "ritual_magic_spell", "spell_container"],
			equipment: ["eqp_modifier", "eqp_modifier_container"],
			equipment_container: ["equipment", "equipment_container", "eqp_modifier", "eqp_modifier_container"],
			eqp_modifier_container: ["eqp_modifier", "eqp_modifier_container"],
			note_container: ["note", "note_container"],
		},
		childTypes: {
			trait: ["trait", "trait_container"],
			trait_container: ["trait", "trait_container"],
			modifier_container: ["modifier", "modifier_container"],
			skill: ["skill", "technique", "skill_container"],
			technique: ["skill", "technique", "skill_container"],
			skill_container: ["skill", "technique", "skill_container"],
			spell: ["spell", "ritual_magic_spell", "spell_container"],
			ritual_magic_spell: ["spell", "ritual_magic_spell", "spell_container"],
			spell_container: ["spell", "ritual_magic_spell", "spell_container"],
			equipment: ["equipment", "equipment_container"],
			equipment_container: ["equipment", "equipment_container"],
			eqp_modifier_container: ["eqp_modifier", "eqp_modifier_container"],
			note: ["note", "note_container"],
			note_container: ["note", "note_container"],
		},
	},
	Actor: {
		documentClasses: {
			character_gcs: CharacterGURPS,
			// TODO: change to static charsheet
			character: StaticCharacterGURPS,
		},
		allowedContents: {
			character: [
				"trait",
				"trait_container",
				"skill",
				"technique",
				"skill_container",
				"spell",
				"ritual_magic_spell",
				"spell_container",
				"equipment",
				"equipment_container",
				"note",
				"note_container",
			],
		},
	},
	Feature: {
		classes: {
			attribute_bonus: AttributeBonus,
			conditional_modifier: ConditionalModifier,
			dr_bonus: DRBonus,
			reaction_bonus: ReactionBonus,
			skill_bonus: SkillBonus,
			skill_point_bonus: SkillPointBonus,
			spell_bonus: SpellBonus,
			spell_point_bonus: SpellPointBonus,
			weapon_bonus: WeaponDamageBonus,
			weapon_dr_divisor_bonus: WeaponDRDivisorBonus,
			cost_reduction: CostReduction,
			contained_weight_reduction: ContainedWeightReduction,
		},
	},
	Prereq: {
		classes: {
			prereq_list: PrereqList,
			trait_prereq: TraitPrereq,
			attribute_prereq: AttributePrereq,
			contained_quantity_prereq: ContainedQuantityPrereq,
			contained_weight_prereq: ContainedWeightPrereq,
			skill_prereq: SkillPrereq,
			spell_prereq: SpellPrereq,
		},
	},
	Weapon: {
		classes: {
			melee_weapon: MeleeWeapon,
			ranged_weapon: RangedWeapon,
		},
	},
	select: {
		cr_level: {
			0: "gurps.select.cr_level.0",
			6: "gurps.select.cr_level.6",
			9: "gurps.select.cr_level.9",
			12: "gurps.select.cr_level.12",
			15: "gurps.select.cr_level.15",
		},
		cr_adj: {
			none: "gurps.select.cr_adj.none",
			action_penalty: "gurps.select.cr_adj.action_penalty",
			reaction_penalty: "gurps.select.cr_adj.reaction_penalty",
			fright_check_penalty: "gurps.select.cr_adj.fright_check_penalty",
			fright_check_bonus: "gurps.select.cr_adj.fright_check_bonus",
			minor_cost_of_living_increase: "gurps.select.cr_adj.minor_cost_of_living_increase",
			major_cost_of_living_increase: "gurps.select.cr_adj.major_cost_of_living_increase",
		},
		number_compare: {
			none: "gurps.select.number_compare.none",
			is: "gurps.select.number_compare.is",
			is_not: "gurps.select.number_compare.is_not",
			at_least: "gurps.select.number_compare.at_least",
			at_most: "gurps.select.number_compare.at_most",
		},
		number_compare_strict: {
			is: "gurps.select.number_compare_strict.is",
			at_least: "gurps.select.number_compare_strict.at_least",
			at_most: "gurps.select.number_compare_strict.at_most",
		},
		string_compare: {
			none: "gurps.select.string_compare.none",
			is: "gurps.select.string_compare.is",
			is_not: "gurps.select.string_compare.is_not",
			contains: "gurps.select.string_compare.contains",
			does_not_contain: "gurps.select.string_compare.does_not_contain",
			starts_with: "gurps.select.string_compare.starts_with",
			does_not_start_with: "gurps.select.string_compare.does_not_start_with",
			ends_with: "gurps.select.string_compare.ends_with",
			does_not_end_with: "gurps.select.string_compare.does_not_end_with",
		},
		has: {
			true: "gurps.select.has.true",
			false: "gurps.select.has.false",
		},
		prereqs: {
			trait_prereq: "gurps.select.prereqs.trait_prereq",
			attribute_prereq: "gurps.select.prereqs.attribute_prereq",
			contained_quantity_prereq: "gurps.select.prereqs.contained_quantity_prereq",
			contained_weight_prereq: "gurps.select.prereqs.contained_weight_prereq",
			skill_prereq: "gurps.select.prereqs.skill_prereq",
			spell_prereq: "gurps.select.prereqs.spell_prereq",
		},
		spell_sub_type: {
			name: "gurps.select.spell_sub_type.name",
			tag: "gurps.select.spell_sub_type.tag",
			college: "gurps.select.spell_sub_type.college",
			college_count: "gurps.select.spell_sub_type.college_count",
			any: "gurps.select.spell_sub_type.any",
		},
		features: {
			attribute_bonus: "gurps.select.features.attribute_bonus",
			conditional_modifier: "gurps.select.features.conditional_modifier",
			dr_bonus: "gurps.select.features.dr_bonus",
			reaction_bonus: "gurps.select.features.reaction_bonus",
			skill_bonus: "gurps.select.features.skill_bonus",
			skill_point_bonus: "gurps.select.features.skill_point_bonus",
			spell_bonus: "gurps.select.features.spell_bonus",
			spell_point_bonus: "gurps.select.features.spell_point_bonus",
			weapon_bonus: "gurps.select.features.weapon_bonus",
			weapon_dr_divisor_bonus: "gurps.select.features.weapon_dr_divisor_bonus",
			cost_reduction: "gurps.select.features.cost_reduction",
		},
		features_eqc: {
			contained_weight_reduction: "gurps.select.features.contained_weight_reduction",
		},
		st_limitation: {
			none: "gurps.select.st_limitation.none",
			striking_only: "gurps.select.st_limitation.striking_only",
			lifting_only: "gurps.select.st_limitation.lifting_only",
			throwing_only: "gurps.select.st_limitation.throwing_only",
		},
		skill_bonus_selection_type: {
			skills_with_name: "gurps.select.skill_bonus_selection_type.skills_with_name",
			weapons_with_name: "gurps.select.skill_bonus_selection_type.weapons_with_name",
			this_weapon: "gurps.select.skill_bonus_selection_type.this_weapon",
		},
		weapon_bonus_selection_type: {
			weapons_with_required_skill: "gurps.select.weapon_bonus_selection_type.weapons_with_required_skill",
			weapons_with_name: "gurps.select.weapon_bonus_selection_type.weapons_with_name",
			this_weapon: "gurps.select.weapon_bonus_selection_type.this_weapon",
		},
		spell_match: {
			all_colleges: "gurps.select.spell_match.all_colleges",
			college_name: "gurps.select.spell_match.college_name",
			power_source_name: "gurps.select.spell_match.power_source_name",
			spell_name: "gurps.select.spell_match.spell_name",
		},
		percentage: {
			5: "5",
			10: "10",
			15: "15",
			20: "20",
			25: "25",
			30: "30",
			35: "35",
			40: "40",
			45: "45",
			50: "50",
			55: "55",
			60: "60",
			65: "65",
			70: "70",
			75: "75",
			80: "80",
		},
		damage_st: {
			none: "gurps.select.damage_st.none",
			thr: "gurps.select.damage_st.thr",
			thr_leveled: "gurps.select.damage_st.thr_leveled",
			sw: "gurps.select.damage_st.sw",
			sw_leveled: "gurps.select.damage_st.sw_leveled",
		},
		container_type: {
			group: "gurps.select.container_type.group",
			meta_trait: "gurps.select.container_type.meta_trait",
			race: "gurps.select.container_type.race",
			alternative_abilities: "gurps.select.container_type.alternative_abilities",
		},
		difficulty: {
			e: "gurps.select.difficulty.easy",
			a: "gurps.select.difficulty.average",
			h: "gurps.select.difficulty.hard",
			vh: "gurps.select.difficulty.very_hard",
			w: "gurps.select.difficulty.wildcard",
		},
		trait_mod_cost_type: {
			percentage_leveled: "gurps.select.trait_mod_cost_type.percentage_leveled",
			percentage: "gurps.select.trait_mod_cost_type.percentage",
			points: "gurps.select.trait_mod_cost_type.points",
			multiplier: "gurps.select.trait_mod_cost_type.multiplier",
		},
		trait_mod_affects: {
			total: "gurps.select.trait_mod_affects.total",
			base_only: "gurps.select.trait_mod_affects.base_only",
			levels_only: "gurps.select.trait_mod_affects.levels_only",
		},
		eqp_mod_cost_type: {
			to_original_cost: "gurps.select.eqp_mod_cost_type.to_original_cost",
			to_base_cost: "gurps.select.eqp_mod_cost_type.to_base_cost",
			to_final_base_cost: "gurps.select.eqp_mod_cost_type.to_final_base_cost",
			to_final_cost: "gurps.select.eqp_mod_cost_type.to_final_cost",
		},
		eqp_mod_weight_type: {
			to_original_weight: "gurps.select.eqp_mod_weight_type.to_original_weight",
			to_base_weight: "gurps.select.eqp_mod_weight_type.to_base_weight",
			to_final_base_weight: "gurps.select.eqp_mod_weight_type.to_final_base_weight",
			to_final_weight: "gurps.select.eqp_mod_weight_type.to_final_weight",
		},
		maneuvers: {
			none: "gurps.select.maneuvers.none",
			do_nothing: "gurps.select.maneuvers.do_nothing",
			move: "gurps.select.maneuvers.move",
			aim: "gurps.select.maneuvers.aim",
			change_posture: "gurps.select.maneuvers.change_posture",
			evaluate: "gurps.select.maneuvers.evaluate",
			attack: "gurps.select.maneuvers.attack",
			feint: "gurps.select.maneuvers.feint",
			all_out_attack: "gurps.select.maneuvers.all_out_attack",
			all_out_attack_determined: "gurps.select.maneuvers.all_out_attack_determined",
			all_out_attack_double: "gurps.select.maneuvers.all_out_attack_double",
			all_out_attack_feint: "gurps.select.maneuvers.all_out_attack_feint",
			all_out_attack_strong: "gurps.select.maneuvers.all_out_attack_strong",
			all_out_attack_suppressing_fire: "gurps.select.maneuvers.all_out_attack_suppressing_fire",
			move_and_attack: "gurps.select.maneuvers.move_and_attack",
			all_out_defense: "gurps.select.maneuvers.all_out_defense",
			all_out_defense_dodge: "gurps.select.maneuvers.all_out_defense_dodge",
			all_out_defense_parry: "gurps.select.maneuvers.all_out_defense_parry",
			all_out_defense_block: "gurps.select.maneuvers.all_out_defense_block",
			all_out_defense_double: "gurps.select.maneuvers.all_out_defense_double",
			ready: "gurps.select.maneuvers.ready",
			concentrate: "gurps.select.maneuvers.concentrate",
			wait: "gurps.select.maneuvers.wait",
		},
		move_types: {
			ground: "gurps.select.move_type.ground",
			air: "gurps.select.move_type.air",
			water: "gurps.select.move_type.water",
			space: "gurps.select.move_type.space",
		},
		postures: {
			standing: "gurps.select.postures.standing",
			lying: "gurps.select.postures.lying",
			kneeling: "gurps.select.postures.kneeling",
			crouching: "gurps.select.postures.crouching",
			sitting: "gurps.select.postures.sitting",
			crawling: "gurps.select.postures.crawling",
		},
		damage_progression: {
			basic_set: "gurps.select.damage_progression.basic_set",
			knowing_your_own_strength: "gurps.select.damage_progression.knowing_your_own_strength",
			no_school_grognard_damage: "gurps.select.damage_progression.no_school_grognard_damage",
			thrust_equals_swing_minus_2: "gurps.select.damage_progression.thrust_equals_swing_minus_2",
			swing_equals_thrust_plus_2: "gurps.select.damage_progression.swing_equals_thrust_plus_2",
			phoenix_flame_d3: "gurps.select.damage_progression.phoenix_flame_d3",
		},
		default_length_units: {
			ft_in: "gurps.length_units.ft_in",
			in: "gurps.length_units.in",
			ft: "gurps.length_units.ft",
			yd: "gurps.length_units.yd",
			mi: "gurps.length_units.mi",
			cm: "gurps.length_units.cm",
			km: "gurps.length_units.km",
			m: "gurps.length_units.m",
		},
		default_weight_units: {
			lb: "gurps.select.default_weight_units.lb",
			lb_2: "gurps.select.default_weight_units.#",
			oz: "gurps.select.default_weight_units.oz",
			tn: "gurps.select.default_weight_units.tn",
			t: "gurps.select.default_weight_units.t",
			kg: "gurps.select.default_weight_units.kg",
			g: "gurps.select.default_weight_units.g",
		},
		display: {
			not_shown: "gurps.select.display.not_shown",
			inline: "gurps.select.display.inline",
			tooltip: "gurps.select.display.tooltip",
			inline_and_tooltip: "gurps.select.display.inline_and_tooltip",
		},
		attribute_type: {
			integer: "gurps.select.attribute_type.integer",
			decimal: "gurps.select.attribute_type.decimal",
			pool: "gurps.select.attribute_type.pool",
			primary_separator: "gurps.select.attribute_type.primary_separator",
			secondary_separator: "gurps.select.attribute_type.secondary_separator",
			pool_separator: "gurps.select.attribute_type.pool_separator",
		},
		study_type: {
			[StudyType.Self]: "gurps.select.study_type.self",
			[StudyType.Job]: "gurps.select.study_type.job",
			[StudyType.Teacher]: "gurps.select.study_type.teacher",
			[StudyType.Intensive]: "gurps.select.study_type.intensive",
		},
		color_mode_preference: {
			auto: "gurps.select.color_mode_preference.auto",
			dark: "gurps.select.color_mode_preference.dark",
			light: "gurps.select.color_mode_preference.light",
		},
	},
}
// GURPSCONFIG.Item.documentClasses = {};
// GURPSCONFIG.Actor.documentClasses = {
// 	character: CharacterGURPS,
// };
export { GURPSCONFIG }
