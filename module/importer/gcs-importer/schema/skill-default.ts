import { GcsElement } from './base.js'

import fields = foundry.data.fields

/* ---------------------------------------- */

class GcsSkillDefault extends GcsElement<SkillDefaultData> {
  static override defineSchema(): SkillDefaultData {
    return skillDefaultData()
  }
}

/* ---------------------------------------- */

const skillDefaultData = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false }),
    name: new fields.StringField({ required: true, nullable: true }),
    specialization: new fields.StringField({ required: true, nullable: true }),
    modifier: new fields.NumberField({ required: true, nullable: true }),
    level: new fields.NumberField({ required: true, nullable: true }),
    adjusted_level: new fields.NumberField({ required: true, nullable: true }),
    points: new fields.NumberField({ required: true, nullable: true }),
    // STUB: when_tl is not yet supported
    when_tl: new fields.ObjectField({ required: true, nullable: true }),
  }
}

type SkillDefaultData = ReturnType<typeof skillDefaultData>

/* ---------------------------------------- */

export { GcsSkillDefault, skillDefaultData, type SkillDefaultData }
