import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'

import { BaseFeature } from './base-feature.js'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType } from './types.js'

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

type AttributeBonusSchema = BaseFeature.Schema & ReturnType<typeof attributeBonusSchema>

/* ---------------------------------------- */

export { AttributeBonus }
