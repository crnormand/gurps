import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType, SpellMatchType } from './types.ts'

class SpellBonus extends BaseFeature<SpellBonusSchema> implements ILeveledAmount {
  static override defineSchema(): SpellBonusSchema {
    return Object.assign(super.defineSchema(), spellBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.SpellBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const spellBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    match: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(SpellMatchType),
      initial: SpellMatchType.AllColleges,
    }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    tags: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type SpellBonusSchema = BaseFeatureSchema & ReturnType<typeof spellBonusSchema>

/* ---------------------------------------- */

export { SpellBonus }
