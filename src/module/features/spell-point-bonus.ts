import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType, SpellMatchType } from './types.ts'

class SpellPointBonus extends BaseFeature<SpellPointBonusSchema> implements ILeveledAmount {
  static override defineSchema(): SpellPointBonusSchema {
    return Object.assign(super.defineSchema(), spellPointBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.SpellPointBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const spellPointBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    match: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(SpellMatchType),
      initial: SpellMatchType.AllColleges,
    }),
    name: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type SpellPointBonusSchema = BaseFeatureSchema & ReturnType<typeof spellPointBonusSchema>

/* ---------------------------------------- */

export { SpellPointBonus }
