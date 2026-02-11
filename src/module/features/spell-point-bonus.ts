import { fields } from '@gurps-types/foundry/index.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType, SpellMatchType } from './types.js'

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

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    if (this.name) INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    if (this.tags) INameable.extract.call(this, this.tags.qualifier ?? '', map, existing)
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
