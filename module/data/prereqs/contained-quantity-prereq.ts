import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'

import { BasePrereq, basePrereqSchema } from './base-prereq.ts'

class ContainedQuantityPrereq extends BasePrereq<ContainedQuantityPrereqSchema> {
  static override defineSchema(): ContainedQuantityPrereqSchema {
    return containedQuantityPrereqSchema()
  }
}

/* ---------------------------------------- */

const containedQuantityPrereqSchema = () => {
  return {
    ...basePrereqSchema(),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    qualifier: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type ContainedQuantityPrereqSchema = ReturnType<typeof containedQuantityPrereqSchema>

/* ---------------------------------------- */

export { ContainedQuantityPrereq }
