import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType } from './types.ts'

class TraitBonus extends BaseFeature<TraitBonusSchema> implements ILeveledAmount {
  static override defineSchema(): TraitBonusSchema {
    return Object.assign(super.defineSchema(), traitBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.TraitBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const traitBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    name: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type TraitBonusSchema = BaseFeatureSchema & ReturnType<typeof traitBonusSchema>

/* ---------------------------------------- */

export { TraitBonus }
