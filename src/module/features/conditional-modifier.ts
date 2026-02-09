import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType } from './types.ts'

class ConditionalModifier extends BaseFeature<ConditionalModifierSchema> implements ILeveledAmount {
  static override defineSchema(): ConditionalModifierSchema {
    return Object.assign(super.defineSchema(), conditionalModifierSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.ConditionalModifier
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const conditionalModifierSchema = () => {
  return {
    ...leveledAmountSchema(),
    situation: new fields.StringField({ required: true, nullable: false }),
  }
}

type ConditionalModifierSchema = BaseFeatureSchema & ReturnType<typeof conditionalModifierSchema>

/* ---------------------------------------- */

export { ConditionalModifier }
