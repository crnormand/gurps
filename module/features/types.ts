enum FeatureType {
  AttributeBonus = 'attributeBonus',
  ConditionalModifier = 'conditionalModifier',
  DRBonus = 'drBonus',
  ReactionBonus = 'reactionBonus',
  SkillBonus = 'skillBonus',
  SkillPointBonus = 'skillPointBonus',
  SpellBonus = 'spellBonus',
  SpellPointBonus = 'spellPointBonus',
  TraitBonus = 'traitBonus',
  WeaponBonus = 'weaponBonus',
  WeaponAccBonus = 'weaponAccBonus',
  WeaponScopeAccBonus = 'weaponScopeAccBonus',
  WeaponDRDivisorBonus = 'weaponDrDivisorBonus',
  WeaponEffectiveSTBonus = 'weaponEffectiveStBonus',
  WeaponMinSTBonus = 'weaponMinStBonus',
  WeaponMinReachBonus = 'weaponMinReachBonus',
  WeaponMaxReachBonus = 'weaponMaxReachBonus',
  WeaponHalfDamageRangeBonus = 'weaponHalfDamageRangeBonus',
  WeaponMinRangeBonus = 'weaponMinRangeBonus',
  WeaponMaxRangeBonus = 'weaponMaxRangeBonus',
  WeaponRecoilBonus = 'weaponRecoilBonus',
  WeaponBulkBonus = 'weaponBulkBonus',
  WeaponParryBonus = 'weaponParryBonus',
  WeaponBlockBonus = 'weaponBlockBonus',
  WeaponRofMode1ShotsBonus = 'weaponRofMode1ShotsBonus',
  WeaponRofMode1SecondaryBonus = 'weaponRofMode1SecondaryBonus',
  WeaponRofMode2ShotsBonus = 'weaponRofMode2ShotsBonus',
  WeaponRofMode2SecondaryBonus = 'weaponRofMode2SecondaryBonus',
  WeaponNonChamberShotsBonus = 'weaponNonChamberShotsBonus',
  WeaponChamberShotsBonus = 'weaponChamberShotsBonus',
  WeaponShotDurationBonus = 'weaponShotDurationBonus',
  WeaponReloadTimeBonus = 'weaponReloadTimeBonus',
  WeaponSwitch = 'weaponSwitch',
  CostReduction = 'costReduction',
  ContainedWeightReduction = 'containedWeightReduction',
}

/* ---------------------------------------- */

enum SkillBonusSelectionType {
  Name = 'skillsWithName',
  ThisWeapon = 'thisWeapon',
  WeaponsWithName = 'weaponsWithName',
}

/* ---------------------------------------- */

enum SpellMatchType {
  AllColleges = 'allColleges',
  CollegeName = 'collegeName',
  PowerSource = 'powerSourceName',
  Name = 'spellName',
}

/* ---------------------------------------- */

enum WeaponBonusSelectionType {
  WithRequiredSkill = 'weaponsWithRequiredSkill',
  ThisWeapon = 'thisWeapon',
  WithName = 'weaponsWithName',
}

/* ---------------------------------------- */

enum WeaponSwitchType {
  NotSwitched = 'notSwitched',
  CanBlock = 'canBlock',
  CanParry = 'canParry',
  CloseCombat = 'closeCombat',
  Fencing = 'fencing',
  FullAuto1 = 'fullAuto1',
  FullAuto2 = 'fullAuto2',
  Bipod = 'bipod',
  ControlledBursts1 = 'controlledBursts1',
  ControlledBursts2 = 'controlledBursts2',
  Jet = 'jet',
  Mounted = 'mounted',
  MusclePowered = 'musclePowered',
  RangeInMiles = 'rangeInMiles',
  ReachChangeRequiresReady = 'reachChangeRequiresReady',
  ReloadTimeIsPerShot = 'reloadTimeIsPerShot',
  RetractingStock = 'retractingStock',
  TwoHanded = 'two-handed',
  Thrown = 'thrown',
  Unbalanced = 'unbalanced',
  TwoHandedAndUnreadyAfterAttack = 'twoHandedAndUnreadyAfterAttack',
  MusketRest = 'musketRest',
}

/* ---------------------------------------- */

export { FeatureType, SkillBonusSelectionType, SpellMatchType, WeaponBonusSelectionType, WeaponSwitchType }
