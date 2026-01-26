import { fields } from '../../types/foundry/index.js'

import { BaseFeatureModel, BaseFeatureSchema } from './base.ts'

class SkillBonus extends BaseFeatureModel<SkillBonusSchema> {
  static override defineSchema(): SkillBonusSchema {
    return {
      ...super.defineSchema(),
      ...skillBonusSchema(),
    }
  }
}

/* ---------------------------------------- */

const skillBonusSchema = () => {
  return {
    selectionType: new fields.StringField({ required: true, nullable: false, choices: [] }),
  }
}

type SkillBonusSchema = ReturnType<typeof skillBonusSchema> & BaseFeatureSchema

/* ---------------------------------------- */

export { SkillBonus }
