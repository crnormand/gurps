import { DataModel, fields } from '@gurps-types/foundry/index.js'

import { NumberCriteriaField } from './criteria/number-criteria.js'

class SkillDefault extends DataModel<SkillDefaultSchema> {
  static override defineSchema(): SkillDefaultSchema {
    return skillDefaultSchema()
  }
}

/* ---------------------------------------- */

const skillDefaultSchema = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false }),
    name: new fields.StringField({ required: true, nullable: false }),
    specialization: new fields.StringField({ required: true, nullable: false }),
    modifier: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    level: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    adjustedLevel: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    points: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    whenTl: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type SkillDefaultSchema = ReturnType<typeof skillDefaultSchema>

/* ---------------------------------------- */

export { SkillDefault, skillDefaultSchema, type SkillDefaultSchema }
