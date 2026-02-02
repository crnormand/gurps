import { fields } from '../../types/foundry/index.js'
import { StringCriteriaField } from '../criteria/string-criteria.ts'

import { BasePrereq, basePrereqSchema, PrereqType } from './base-prereq.ts'

class EquippedEquipmentPrereq extends BasePrereq<EquippedEquipmentPrereqSchema> {
  static override defineSchema(): EquippedEquipmentPrereqSchema {
    return equippedEquipmentPrereqSchema()
  }
}

/* ---------------------------------------- */

const equippedEquipmentPrereqSchema = () => {
  return {
    ...basePrereqSchema({ type: PrereqType.EquippedEquipment }),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    name: new StringCriteriaField({ required: true, nullable: false }),
    tags: new StringCriteriaField({ required: true, nullable: false }),
  }
}

type EquippedEquipmentPrereqSchema = ReturnType<typeof equippedEquipmentPrereqSchema>

/* ---------------------------------------- */

export { EquippedEquipmentPrereq }
