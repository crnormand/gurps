import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BaseFeature, BaseFeatureSchema } from './base-feature.js'
import { ILeveledAmount, getLeveledAmount, leveledAmountSchema } from './leveled-amount.js'
import { FeatureType } from './types.js'

class SkillPointBonus extends BaseFeature<SkillPointBonusSchema> implements ILeveledAmount {
  static override defineSchema(): SkillPointBonusSchema {
    return Object.assign(super.defineSchema(), skillPointBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.SkillPointBonus
  }
  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    if (this.name) INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    if (this.specialization) INameable.extract.call(this, this.specialization.qualifier ?? '', map, existing)
    if (this.tags) INameable.extract.call(this, this.tags.qualifier ?? '', map, existing)
  }
}

/* ---------------------------------------- */

const skillPointBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    name: new StringCriteriaField({ required: false, nullable: true }),
    specialization: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type SkillPointBonusSchema = BaseFeatureSchema & ReturnType<typeof skillPointBonusSchema>

/* ---------------------------------------- */

export { SkillPointBonus }
