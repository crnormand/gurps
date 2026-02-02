import { NumberCriteriaField } from '../data/criteria/number-criteria.ts'
import { fields } from '../types/foundry/index.ts'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class AttributePrereq extends BasePrereq<AttributePrereqSchema> {
  static override defineSchema(): AttributePrereqSchema {
    return Object.assign(super.defineSchema(), attributePrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Attribute
  }

  /* ---------------------------------------- */

  override get isSatisfied(): boolean {
    const actor = this.actor

    if (!actor || !actor.isOfType('gcsCharacter')) {
      console.error('AttributePrereq: No Actor provided or invalid Actor type.')

      return false
    }

    // let total = 0

    const which = actor.system.attributes[this.which]

    if (!which) {
      console.error(`AttributePrereq: Specified attribute not found on actor: ${which}`)

      return false
    }

    // NOTE: temporary
    return true
  }
}

/* ---------------------------------------- */

const attributePrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    which: new fields.StringField({ required: true, nullable: false }),
    combinedWith: new fields.StringField({ required: true, nullable: true }),
    qualifier: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type AttributePrereqSchema = BasePrereqSchema & ReturnType<typeof attributePrereqSchema>

/* ---------------------------------------- */

export { AttributePrereq }
