import { WeightCriteriaField } from '../data/criteria/weight-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class ContainedWeightPrereq extends BasePrereq<ContainedWeightPrereqSchema> {
  static override defineSchema(): ContainedWeightPrereqSchema {
    return Object.assign(super.defineSchema(), containedWeightPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.ContainedWeight
  }
}

/* ---------------------------------------- */

const containedWeightPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    qualifier: new WeightCriteriaField({ required: true, nullable: false }),
  }
}

type ContainedWeightPrereqSchema = BasePrereqSchema & ReturnType<typeof containedWeightPrereqSchema>

/* ---------------------------------------- */

export { ContainedWeightPrereq }
