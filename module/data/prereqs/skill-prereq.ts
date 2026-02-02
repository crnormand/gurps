import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'
import { StringCriteriaField } from '../criteria/string-criteria.ts'

import { BasePrereq, basePrereqSchema, PrereqType } from './base-prereq.ts'

class SkillPrereq extends BasePrereq<SkillPrereqSchema> {
  static override defineSchema(): SkillPrereqSchema {
    return skillPrereqSchema()
  }
}

/* ---------------------------------------- */

const skillPrereqSchema = () => {
  return {
    ...basePrereqSchema({ type: PrereqType.Skill }),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    specialization: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type SkillPrereqSchema = ReturnType<typeof skillPrereqSchema>

/* ---------------------------------------- */

export { SkillPrereq }
