import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class SkillPrereq extends BasePrereq<SkillPrereqSchema> {
  static override defineSchema(): SkillPrereqSchema {
    return Object.assign(super.defineSchema(), skillPrereqSchema())
  }
  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Skill
  }
}

/* ---------------------------------------- */

const skillPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    specialization: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type SkillPrereqSchema = BasePrereqSchema & ReturnType<typeof skillPrereqSchema>

/* ---------------------------------------- */

export { SkillPrereq }
