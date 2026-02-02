import { fields } from '../../types/foundry/index.js'
import { WeightCriteriaField } from '../criteria/weight-criteria.ts'

import { BasePrereq, basePrereqSchema, PrereqType } from './base-prereq.ts'

class ContainedWeightPrereq extends BasePrereq<ContainedWeightPrereqSchema> {
  static override defineSchema(): ContainedWeightPrereqSchema {
    return containedWeightPrereqSchema()
  }
}

/* ---------------------------------------- */

const containedWeightPrereqSchema = () => {
  return {
    ...basePrereqSchema({ type: PrereqType.ContainedWeight }),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    qualifier: new WeightCriteriaField({ required: true, nullable: false }),
  }
}

type ContainedWeightPrereqSchema = ReturnType<typeof containedWeightPrereqSchema>

/* ---------------------------------------- */

export { ContainedWeightPrereq }
