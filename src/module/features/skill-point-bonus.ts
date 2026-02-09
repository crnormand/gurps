import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType } from './types.ts'

class SkillPointBonus extends BaseFeature<SkillPointBonusSchema> implements ILeveledAmount {
  static override defineSchema(): SkillPointBonusSchema {
    return Object.assign(super.defineSchema(), skillPointBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.SkillPointBonus
  }
  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const skillPointBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    name: new StringCriteriaField({ required: false, nullable: true }),
    specialization: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type SkillPointBonusSchema = BaseFeatureSchema & ReturnType<typeof skillPointBonusSchema>

/* ---------------------------------------- */

export { SkillPointBonus }
