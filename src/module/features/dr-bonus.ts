import { fields } from '@gurps-types/foundry/index.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType } from './types.js'

class DRBonus extends BaseFeature<DRBonusSchema> implements ILeveledAmount {
  static override defineSchema(): DRBonusSchema {
    return Object.assign(super.defineSchema(), drBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.DRBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const drBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    locations: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    specialization: new fields.StringField({ required: false, nullable: true }),
  }
}

type DRBonusSchema = BaseFeatureSchema & ReturnType<typeof drBonusSchema>

/* ---------------------------------------- */

export { DRBonus }
