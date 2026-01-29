import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'
import { StringCriteriaField } from '../criteria/string-criteria.ts'

import { BasePrereq, basePrereqSchema } from './base-prereq.ts'

class TraitPrereq extends BasePrereq<TraitPrereqSchema> {
  static override defineSchema(): TraitPrereqSchema {
    return traitPrereqSchema()
  }
}

/* ---------------------------------------- */

const traitPrereqSchema = () => {
  return {
    ...basePrereqSchema(),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    level: new NumberCriteriaField({ required: true, nullable: false }),
    notes: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type TraitPrereqSchema = ReturnType<typeof traitPrereqSchema>

/* ---------------------------------------- */

export { TraitPrereq }
