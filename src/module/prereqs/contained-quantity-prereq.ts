import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { ItemType } from '@module/item/types.js'

import { BasePrereq } from './base-prereq.js'
import { PrereqType } from './types.js'

class ContainedQuantityPrereq extends BasePrereq<ContainedQuantityPrereqSchema> {
  static override defineSchema(): ContainedQuantityPrereqSchema {
    return Object.assign(super.defineSchema(), containedQuantityPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.ContainedQuantity
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const item = this.item

    if (!item || !item.isOfType(ItemType.GcsEquipment, ItemType.GcsTrait))
      throw new Error('ContainedQuantityPrereq: No Item provided or invalid Item type.')

    if (!item.system.isContainer)
      throw new Error('ContainedQuantityPrereq: Item is not a container, prerequisite is invalid.')

    const count = item.system.children.length

    const matches = this.qualifier.matches(count)

    return this.has ? matches : !matches
  }
}

/* ---------------------------------------- */

const containedQuantityPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    qualifier: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type ContainedQuantityPrereqSchema = BasePrereq.Schema & ReturnType<typeof containedQuantityPrereqSchema>

/* ---------------------------------------- */

export { ContainedQuantityPrereq }
