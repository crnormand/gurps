import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType } from './types.ts'

class AttributeBonus extends BaseFeature<AttributeBonusSchema> implements ILeveledAmount {
  static override defineSchema(): AttributeBonusSchema {
    return Object.assign(super.defineSchema(), attributeBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.AttributeBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const attributeBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    which: new fields.StringField({ required: true, nullable: false }),
    combinedWith: new fields.StringField({ required: true, nullable: true }),
    qualifier: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type AttributeBonusSchema = BaseFeatureSchema & ReturnType<typeof attributeBonusSchema>

/* ---------------------------------------- */

export { AttributeBonus }
