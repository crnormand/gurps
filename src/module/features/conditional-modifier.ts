import { fields } from '@gurps-types/foundry/index.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType } from './types.js'

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

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.situation, map, existing)
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
