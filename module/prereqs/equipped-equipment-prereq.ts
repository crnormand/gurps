import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class EquippedEquipmentPrereq extends BasePrereq<EquippedEquipmentPrereqSchema> {
  static override defineSchema(): EquippedEquipmentPrereqSchema {
    return Object.assign(super.defineSchema(), equippedEquipmentPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.EquippedEquipment
  }
}

/* ---------------------------------------- */

const equippedEquipmentPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    tags: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type EquippedEquipmentPrereqSchema = BasePrereqSchema & ReturnType<typeof equippedEquipmentPrereqSchema>

/* ---------------------------------------- */

export { EquippedEquipmentPrereq }
