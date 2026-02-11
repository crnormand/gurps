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

    GURPS.CONFIG.Feature = {
      [FeatureType.AttributeBonus]: { documentClass: AttributeBonus },
      [FeatureType.ConditionalModifier]: { documentClass: ConditionalModifier },
      [FeatureType.DRBonus]: { documentClass: DRBonus },
      [FeatureType.ReactionBonus]: { documentClass: ReactionBonus },
      [FeatureType.SkillBonus]: { documentClass: SkillBonus },
      [FeatureType.SkillPointBonus]: { documentClass: SkillPointBonus },
      [FeatureType.SpellBonus]: { documentClass: SpellBonus },
      [FeatureType.SpellPointBonus]: { documentClass: SpellPointBonus },
      [FeatureType.TraitBonus]: { documentClass: TraitBonus },
      [FeatureType.WeaponBonus]: { documentClass: WeaponBonus },
      [FeatureType.WeaponAccBonus]: { documentClass: WeaponAccBonus },
      [FeatureType.WeaponScopeAccBonus]: { documentClass: WeaponScopeAccBonus },
      [FeatureType.WeaponDRDivisorBonus]: { documentClass: WeaponDRDivisorBonus },
      [FeatureType.WeaponEffectiveSTBonus]: { documentClass: WeaponEffectiveSTBonus },
      [FeatureType.WeaponMinSTBonus]: { documentClass: WeaponMinSTBonus },
      [FeatureType.WeaponMinReachBonus]: { documentClass: WeaponMinReachBonus },
      [FeatureType.WeaponMaxReachBonus]: { documentClass: WeaponMaxReachBonus },
      [FeatureType.WeaponHalfDamageRangeBonus]: { documentClass: WeaponHalfDamageRangeBonus },
      [FeatureType.WeaponMinRangeBonus]: { documentClass: WeaponMinRangeBonus },
      [FeatureType.WeaponMaxRangeBonus]: { documentClass: WeaponMaxRangeBonus },
      [FeatureType.WeaponRecoilBonus]: { documentClass: WeaponRecoilBonus },
      [FeatureType.WeaponBulkBonus]: { documentClass: WeaponBulkBonus },
      [FeatureType.WeaponParryBonus]: { documentClass: WeaponParryBonus },
      [FeatureType.WeaponBlockBonus]: { documentClass: WeaponBlockBonus },
      [FeatureType.WeaponRofMode1ShotsBonus]: { documentClass: WeaponRofMode1ShotsBonus },
      [FeatureType.WeaponRofMode1SecondaryBonus]: { documentClass: WeaponRofMode1SecondaryBonus },
      [FeatureType.WeaponRofMode2ShotsBonus]: { documentClass: WeaponRofMode2ShotsBonus },
      [FeatureType.WeaponRofMode2SecondaryBonus]: { documentClass: WeaponRofMode2SecondaryBonus },
      [FeatureType.WeaponNonChamberShotsBonus]: { documentClass: WeaponNonChamberShotsBonus },
      [FeatureType.WeaponChamberShotsBonus]: { documentClass: WeaponChamberShotsBonus },
      [FeatureType.WeaponShotDurationBonus]: { documentClass: WeaponShotDurationBonus },
      [FeatureType.WeaponReloadTimeBonus]: { documentClass: WeaponReloadTimeBonus },
      [FeatureType.WeaponSwitch]: { documentClass: WeaponSwitch },
      [FeatureType.CostReduction]: { documentClass: CostReduction },
      [FeatureType.ContainedWeightReduction]: { documentClass: ContainedWeightReduction },
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
