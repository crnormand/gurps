import { GurpsModule } from '../gurps-module.ts'

import { AttributeBonus } from './attribute-bonus.ts'
import { BaseFeature } from './base-feature.ts'
import { ConditionalModifier } from './conditional-modifier.ts'
import { ContainedWeightReduction } from './contained-weight-reduction.ts'
import { CostReduction } from './cost-reduction.ts'
import { DRBonus } from './dr-bonus.ts'
import { ReactionBonus } from './reaction-bonus.ts'
import { SkillBonus } from './skill-bonus.ts'
import { SkillPointBonus } from './skill-point-bonus.ts'
import { SpellBonus } from './spell-bonus.ts'
import { SpellPointBonus } from './spell-point-bonus.ts'
import { TraitBonus } from './trait-bonus.ts'
import { FeatureType } from './types.ts'
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
} from './weapon-bonus.ts'

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
  [FeatureType.WeaponAccBonus]: WeaponBonus,
  [FeatureType.WeaponScopeAccBonus]: WeaponBonus,
  [FeatureType.WeaponDRDivisorBonus]: WeaponBonus,
  [FeatureType.WeaponEffectiveSTBonus]: WeaponBonus,
  [FeatureType.WeaponMinSTBonus]: WeaponBonus,
  [FeatureType.WeaponMinReachBonus]: WeaponBonus,
  [FeatureType.WeaponMaxReachBonus]: WeaponBonus,
  [FeatureType.WeaponHalfDamageRangeBonus]: WeaponBonus,
  [FeatureType.WeaponMinRangeBonus]: WeaponBonus,
  [FeatureType.WeaponMaxRangeBonus]: WeaponBonus,
  [FeatureType.WeaponRecoilBonus]: WeaponBonus,
  [FeatureType.WeaponBulkBonus]: WeaponBonus,
  [FeatureType.WeaponParryBonus]: WeaponBonus,
  [FeatureType.WeaponBlockBonus]: WeaponBonus,
  [FeatureType.WeaponRofMode1ShotsBonus]: WeaponBonus,
  [FeatureType.WeaponRofMode1SecondaryBonus]: WeaponBonus,
  [FeatureType.WeaponRofMode2ShotsBonus]: WeaponBonus,
  [FeatureType.WeaponRofMode2SecondaryBonus]: WeaponBonus,
  [FeatureType.WeaponNonChamberShotsBonus]: WeaponBonus,
  [FeatureType.WeaponChamberShotsBonus]: WeaponBonus,
  [FeatureType.WeaponShotDurationBonus]: WeaponBonus,
  [FeatureType.WeaponReloadTimeBonus]: WeaponBonus,
  [FeatureType.WeaponSwitch]: WeaponBonus,
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
