import { fields } from '@gurps-types/foundry/index.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType, SpellMatchType } from './types.js'

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

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    INameable.extract.call(this, this.tags.qualifier ?? '', map, existing)
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
