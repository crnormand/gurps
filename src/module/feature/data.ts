export enum FeatureType {
	AttributeBonus = "attribute_bonus",
	ConditionalModifier = "conditional_modifier",
	DRBonus = "dr_bonus",
	ReactionBonus = "reaction_bonus",
	SkillBonus = "skill_bonus",
	SkillPointBonus = "skill_point_bonus",
	SpellBonus = "spell_bonus",
	SpellPointBonus = "spell_point_bonus",
	WeaponBonus = "weapon_bonus",
	WeaponDRDivisorBonus = "weapon_dr_divisor_bonus",
	CostReduction = "cost_reduction",
	ContaiedWeightReduction = "contained_weight_reduction",
	// ThresholdBonus = "threshold_bonus",
}

export type SpellBonusMatch = "all_colleges" | "college_name" | "spell_name" | "power_source_name"
export type WeaponBonusSelectionType = "weapons_with_required_skill" | "weapons_with_name" | "this_weapon"
