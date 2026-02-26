import { GurpsModule } from '@gurps-types/gurps-module.js'

import { AttributeBonus } from './attribute-bonus.js'
import { BaseFeature } from './base-feature.js'
import { ConditionalModifier } from './conditional-modifier.js'
import { ContainedWeightReduction } from './contained-weight-reduction.js'
import { CostReduction } from './cost-reduction.js'
import { DRBonus } from './dr-bonus.js'
import { ReactionBonus } from './reaction-bonus.js'
import { SkillBonus } from './skill-bonus.js'
import { SkillPointBonus } from './skill-point-bonus.js'
import { SpellBonus } from './spell-bonus.js'
import { SpellPointBonus } from './spell-point-bonus.js'
import { TraitBonus } from './trait-bonus.js'
import { FeatureType } from './types.js'
import {
  WeaponBonus,
  WeaponAccBonus,
  WeaponScopeAccBonus,
  WeaponDRDivisorBonus,
  WeaponEffectiveSTBonus,
  WeaponMinSTBonus,
  WeaponMinReachBonus,
  WeaponMaxReachBonus,
  WeaponHalfDamageRangeBonus,
  WeaponMinRangeBonus,
  WeaponMaxRangeBonus,
  WeaponRecoilBonus,
  WeaponBulkBonus,
  WeaponParryBonus,
  WeaponBlockBonus,
  WeaponRofMode1ShotsBonus,
  WeaponRofMode1SecondaryBonus,
  WeaponRofMode2ShotsBonus,
  WeaponRofMode2SecondaryBonus,
  WeaponNonChamberShotsBonus,
  WeaponChamberShotsBonus,
  WeaponShotDurationBonus,
  WeaponReloadTimeBonus,
  WeaponSwitch,
} from './weapon-bonus.js'

/* ---------------------------------------- */

interface FeaturesModule extends GurpsModule {
  models: typeof FeatureClasses
}

/* ---------------------------------------- */

const FeatureClasses = {
  [FeatureType.AttributeBonus]: AttributeBonus,
  [FeatureType.ConditionalModifier]: ConditionalModifier,
  [FeatureType.DRBonus]: DRBonus,
  [FeatureType.ReactionBonus]: ReactionBonus,
  [FeatureType.SkillBonus]: SkillBonus,
  [FeatureType.SkillPointBonus]: SkillPointBonus,
  [FeatureType.SpellBonus]: SpellBonus,
  [FeatureType.SpellPointBonus]: SpellPointBonus,
  [FeatureType.TraitBonus]: TraitBonus,
  [FeatureType.WeaponBonus]: WeaponBonus,
  [FeatureType.WeaponAccBonus]: WeaponAccBonus,
  [FeatureType.WeaponScopeAccBonus]: WeaponScopeAccBonus,
  [FeatureType.WeaponDRDivisorBonus]: WeaponDRDivisorBonus,
  [FeatureType.WeaponEffectiveSTBonus]: WeaponEffectiveSTBonus,
  [FeatureType.WeaponMinSTBonus]: WeaponMinSTBonus,
  [FeatureType.WeaponMinReachBonus]: WeaponMinReachBonus,
  [FeatureType.WeaponMaxReachBonus]: WeaponMaxReachBonus,
  [FeatureType.WeaponHalfDamageRangeBonus]: WeaponHalfDamageRangeBonus,
  [FeatureType.WeaponMinRangeBonus]: WeaponMinRangeBonus,
  [FeatureType.WeaponMaxRangeBonus]: WeaponMaxRangeBonus,
  [FeatureType.WeaponRecoilBonus]: WeaponRecoilBonus,
  [FeatureType.WeaponBulkBonus]: WeaponBulkBonus,
  [FeatureType.WeaponParryBonus]: WeaponParryBonus,
  [FeatureType.WeaponBlockBonus]: WeaponBlockBonus,
  [FeatureType.WeaponRofMode1ShotsBonus]: WeaponRofMode1ShotsBonus,
  [FeatureType.WeaponRofMode1SecondaryBonus]: WeaponRofMode1SecondaryBonus,
  [FeatureType.WeaponRofMode2ShotsBonus]: WeaponRofMode2ShotsBonus,
  [FeatureType.WeaponRofMode2SecondaryBonus]: WeaponRofMode2SecondaryBonus,
  [FeatureType.WeaponNonChamberShotsBonus]: WeaponNonChamberShotsBonus,
  [FeatureType.WeaponChamberShotsBonus]: WeaponChamberShotsBonus,
  [FeatureType.WeaponShotDurationBonus]: WeaponShotDurationBonus,
  [FeatureType.WeaponReloadTimeBonus]: WeaponReloadTimeBonus,
  [FeatureType.WeaponSwitch]: WeaponSwitch,
  [FeatureType.CostReduction]: CostReduction,
  [FeatureType.ContainedWeightReduction]: ContainedWeightReduction,
}

/* ---------------------------------------- */

type AnyFeature = InstanceType<FeatureClass<FeatureType>>
type Feature<Type extends FeatureType> = InstanceType<(typeof FeatureClasses)[Type]>
type AnyFeatureClass = (typeof FeatureClasses)[FeatureType]
type FeatureClass<Type extends FeatureType> = (typeof FeatureClasses)[Type]

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Features module.')
  Hooks.on('init', () => {
    // @ts-expect-error: Invalid type
    GURPS.CONFIG ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument ||= {}

    GURPS.CONFIG.PseudoDocument.Feature = {
      [FeatureType.AttributeBonus]: { documentClass: AttributeBonus, label: 'TYPES.Feature.attributeBonus' },
      [FeatureType.ConditionalModifier]: {
        documentClass: ConditionalModifier,
        label: 'TYPES.Feature.conditionalModifier',
      },
      [FeatureType.DRBonus]: { documentClass: DRBonus, label: 'TYPES.Feature.dRBonus' },
      [FeatureType.ReactionBonus]: { documentClass: ReactionBonus, label: 'TYPES.Feature.reactionBonus' },
      [FeatureType.SkillBonus]: { documentClass: SkillBonus, label: 'TYPES.Feature.skillBonus' },
      [FeatureType.SkillPointBonus]: { documentClass: SkillPointBonus, label: 'TYPES.Feature.skillPointBonus' },
      [FeatureType.SpellBonus]: { documentClass: SpellBonus, label: 'TYPES.Feature.spellBonus' },
      [FeatureType.SpellPointBonus]: { documentClass: SpellPointBonus, label: 'TYPES.Feature.spellPointBonus' },
      [FeatureType.TraitBonus]: { documentClass: TraitBonus, label: 'TYPES.Feature.traitBonus' },
      [FeatureType.WeaponBonus]: { documentClass: WeaponBonus, label: 'TYPES.Feature.weaponBonus' },
      [FeatureType.WeaponAccBonus]: { documentClass: WeaponAccBonus, label: 'TYPES.Feature.weaponAccBonus' },
      [FeatureType.WeaponScopeAccBonus]: {
        documentClass: WeaponScopeAccBonus,
        label: 'TYPES.Feature.weaponScopeAccBonus',
      },
      [FeatureType.WeaponDRDivisorBonus]: {
        documentClass: WeaponDRDivisorBonus,
        label: 'TYPES.Feature.weaponDRDivisorBonus',
      },
      [FeatureType.WeaponEffectiveSTBonus]: {
        documentClass: WeaponEffectiveSTBonus,
        label: 'TYPES.Feature.weaponEffectiveSTBonus',
      },
      [FeatureType.WeaponMinSTBonus]: { documentClass: WeaponMinSTBonus, label: 'TYPES.Feature.weaponMinSTBonus' },
      [FeatureType.WeaponMinReachBonus]: {
        documentClass: WeaponMinReachBonus,
        label: 'TYPES.Feature.weaponMinReachBonus',
      },
      [FeatureType.WeaponMaxReachBonus]: {
        documentClass: WeaponMaxReachBonus,
        label: 'TYPES.Feature.weaponMaxReachBonus',
      },
      [FeatureType.WeaponHalfDamageRangeBonus]: {
        documentClass: WeaponHalfDamageRangeBonus,
        label: 'TYPES.Feature.weaponHalfDamageRangeBonus',
      },
      [FeatureType.WeaponMinRangeBonus]: {
        documentClass: WeaponMinRangeBonus,
        label: 'TYPES.Feature.weaponMinRangeBonus',
      },
      [FeatureType.WeaponMaxRangeBonus]: {
        documentClass: WeaponMaxRangeBonus,
        label: 'TYPES.Feature.weaponMaxRangeBonus',
      },
      [FeatureType.WeaponRecoilBonus]: { documentClass: WeaponRecoilBonus, label: 'TYPES.Feature.weaponRecoilBonus' },
      [FeatureType.WeaponBulkBonus]: { documentClass: WeaponBulkBonus, label: 'TYPES.Feature.weaponBulkBonus' },
      [FeatureType.WeaponParryBonus]: { documentClass: WeaponParryBonus, label: 'TYPES.Feature.weaponParryBonus' },
      [FeatureType.WeaponBlockBonus]: { documentClass: WeaponBlockBonus, label: 'TYPES.Feature.weaponBlockBonus' },
      [FeatureType.WeaponRofMode1ShotsBonus]: {
        documentClass: WeaponRofMode1ShotsBonus,
        label: 'TYPES.Feature.weaponRofMode1ShotsBonus',
      },
      [FeatureType.WeaponRofMode1SecondaryBonus]: {
        documentClass: WeaponRofMode1SecondaryBonus,
        label: 'TYPES.Feature.weaponRofMode1SecondaryBonus',
      },
      [FeatureType.WeaponRofMode2ShotsBonus]: {
        documentClass: WeaponRofMode2ShotsBonus,
        label: 'TYPES.Feature.weaponRofMode2ShotsBonus',
      },
      [FeatureType.WeaponRofMode2SecondaryBonus]: {
        documentClass: WeaponRofMode2SecondaryBonus,
        label: 'TYPES.Feature.weaponRofMode2SecondaryBonus',
      },
      [FeatureType.WeaponNonChamberShotsBonus]: {
        documentClass: WeaponNonChamberShotsBonus,
        label: 'TYPES.Feature.weaponNonChamberShotsBonus',
      },
      [FeatureType.WeaponChamberShotsBonus]: {
        documentClass: WeaponChamberShotsBonus,
        label: 'TYPES.Feature.weaponChamberShotsBonus',
      },
      [FeatureType.WeaponShotDurationBonus]: {
        documentClass: WeaponShotDurationBonus,
        label: 'TYPES.Feature.weaponShotDurationBonus',
      },
      [FeatureType.WeaponReloadTimeBonus]: {
        documentClass: WeaponReloadTimeBonus,
        label: 'TYPES.Feature.weaponReloadTimeBonus',
      },
      [FeatureType.WeaponSwitch]: { documentClass: WeaponSwitch, label: 'TYPES.Feature.weaponSwitch' },
      [FeatureType.CostReduction]: { documentClass: CostReduction, label: 'TYPES.Feature.costReduction' },
      [FeatureType.ContainedWeightReduction]: {
        documentClass: ContainedWeightReduction,
        label: 'TYPES.Feature.containedWeightReduction',
      },
    }
  })
}

/* ---------------------------------------- */

export const Features: FeaturesModule = {
  init,
  models: FeatureClasses,
}

export { FeatureClasses, FeatureType, BaseFeature }

export type { AnyFeature, AnyFeatureClass, Feature, FeatureClass }
