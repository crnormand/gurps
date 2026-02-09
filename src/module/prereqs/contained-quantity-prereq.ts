import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class ContainedQuantityPrereq extends BasePrereq<ContainedQuantityPrereqSchema> {
  static override defineSchema(): ContainedQuantityPrereqSchema {
    return Object.assign(super.defineSchema(), containedQuantityPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.ContainedQuantity
  }
}

/* ---------------------------------------- */

const containedQuantityPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    qualifier: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type ContainedQuantityPrereqSchema = BasePrereqSchema & ReturnType<typeof containedQuantityPrereqSchema>

/* ---------------------------------------- */

export { ContainedQuantityPrereq }
