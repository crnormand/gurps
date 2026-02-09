import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class TraitPrereq extends BasePrereq<TraitPrereqSchema> {
  static override defineSchema(): TraitPrereqSchema {
    return Object.assign(super.defineSchema(), traitPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Trait
  }
}

/* ---------------------------------------- */

const traitPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    notes: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type TraitPrereqSchema = BasePrereqSchema & ReturnType<typeof traitPrereqSchema>

/* ---------------------------------------- */

export { TraitPrereq }
