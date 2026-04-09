import { fields } from '@gurps-types/foundry/index.js'
import { ActorType } from '@module/actor/types.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'

import { BasePrereq } from './base-prereq.js'
import { PrereqType } from './types.js'

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

    if (!actor || !actor.isOfType(ActorType.GcsCharacter))
      throw new Error('AttributePrereq: No Actor provided or invalid Actor type.')

    let totalValue = 0

    const attribute1 = actor.system.attributes[this.which]

    if (!attribute1) throw new Error(`AttributePrereq: Specified attribute not found on actor: ${this.which}`)

    totalValue += attribute1.max

    if (this.combinedWith) {
      const attribute2 = actor.system.attributes[this.combinedWith]

      if (!attribute2) throw new Error(`AttributePrereq: Specified attribute not found on actor: ${this.combinedWith}`)

      totalValue += attribute2.max
    }

    const matches = this.qualifier.matches(totalValue)

    return this.has ? matches : !matches
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

type AttributePrereqSchema = BasePrereq.Schema & ReturnType<typeof attributePrereqSchema>

/* ---------------------------------------- */

export { AttributePrereq }
