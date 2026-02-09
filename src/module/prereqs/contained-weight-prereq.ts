import { fields } from '@gurps-types/foundry/index.js'
import { WeightCriteriaField } from '@module/data/criteria/weight-criteria.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class ContainedWeightPrereq extends BasePrereq<ContainedWeightPrereqSchema> {
  static override defineSchema(): ContainedWeightPrereqSchema {
    return Object.assign(super.defineSchema(), containedWeightPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.ContainedWeight
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const item = this.item

    if (!item || !item.isOfType('gcsEquipment'))
      throw new Error('ContainedWeightPrereq: No Item provided or invalid Item type.')

    if (!item.system.isContainer)
      throw new Error('ContainedWeightPrereq: Item is not a container, prerequisite is invalid.')

    const totalWeight = item.system.extendedWeight

    const matches = this.qualifier.matches(totalWeight)

    return this.has ? matches : !matches
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
