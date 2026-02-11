import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType } from './types.js'

class TraitBonus extends BaseFeature<TraitBonusSchema> implements ILeveledAmount {
  static override defineSchema(): TraitBonusSchema {
    return Object.assign(super.defineSchema(), traitBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.TraitBonus
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

const traitBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    name: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type TraitBonusSchema = BaseFeatureSchema & ReturnType<typeof traitBonusSchema>

/* ---------------------------------------- */

export { TraitBonus }
