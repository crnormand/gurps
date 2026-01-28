import { fields } from '../../types/foundry/index.js'

import { BaseFeatureModel, baseFeatureSchema } from './base-feature.ts'

class SkillBonus extends BaseFeatureModel<SkillBonusSchema> {
  static override defineSchema(): SkillBonusSchema {
    return skillBonusSchema()
  }
}

/* ---------------------------------------- */

const skillBonusSchema = () => {
  return {
    ...baseFeatureSchema(),
    selectionType: new fields.StringField({ required: true, nullable: false, choices: [] }),
  }
}

type SkillBonusSchema = ReturnType<typeof skillBonusSchema>

/* ---------------------------------------- */

export { SkillBonus }
