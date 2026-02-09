import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BaseFeature, BaseFeatureSchema } from './base-feature.ts'
import { getLeveledAmount, ILeveledAmount, leveledAmountSchema } from './leveled-amount.ts'
import { FeatureType, SkillBonusSelectionType } from './types.ts'

/* ---------------------------------------- */

class SkillBonus extends BaseFeature<SkillBonusSchema> implements ILeveledAmount {
  static override defineSchema(): SkillBonusSchema {
    return Object.assign(super.defineSchema(), skillBonusSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): FeatureType {
    return FeatureType.SkillBonus
  }

  /* ---------------------------------------- */

  get adjustedAmount(): number {
    return getLeveledAmount(this)
  }
}

/* ---------------------------------------- */

const skillBonusSchema = () => {
  return {
    ...leveledAmountSchema(),
    selectionType: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(SkillBonusSelectionType),
      initial: SkillBonusSelectionType.Name,
    }),
    name: new StringCriteriaField({ required: false, nullable: true }),
    specialization: new StringCriteriaField({ required: false, nullable: true }),
    tags: new StringCriteriaField({ required: false, nullable: true }),
  }
}

type SkillBonusSchema = BaseFeatureSchema & ReturnType<typeof skillBonusSchema>

/* ---------------------------------------- */

export { SkillBonus }
