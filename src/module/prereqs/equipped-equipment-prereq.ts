import { fields } from '@gurps-types/foundry/index.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'
import { INameable } from '@module/data/mixins/nameable.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class EquippedEquipmentPrereq extends BasePrereq<EquippedEquipmentPrereqSchema> {
  static override defineSchema(): EquippedEquipmentPrereqSchema {
    return Object.assign(super.defineSchema(), equippedEquipmentPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.EquippedEquipment
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter'))
      throw new Error('EquippedEquipmentPrereq: No Actor provided or invalid Actor type.')

    const hasEquipment = actor.items.some(item => {
      if (!item.isOfType('gcsEquipment')) return false
      if (!item.system.carried || !item.system.equipped) return false
      if (!this.name.matches(item.name)) return false

      return this.tags.matches(item.system.tags)
    })

    return this.has ? hasEquipment : !hasEquipment
  }

  /* ---------------------------------------- */

  override fillWithNameableKeys(map: Map<string, string>, existing?: Map<string, string>): void {
    INameable.extract.call(this, this.name.qualifier ?? '', map, existing)
    INameable.extract.call(this, this.tags.qualifier ?? '', map, existing)
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
