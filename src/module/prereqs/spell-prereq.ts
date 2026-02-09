import { fields } from '@gurps-types/foundry/index.js'
import { NumberCriteriaField } from '@module/data/criteria/number-criteria.js'
import { StringCriteriaField } from '@module/data/criteria/string-criteria.js'

import { BasePrereq, BasePrereqSchema, PrereqType } from './base-prereq.ts'

class SpellPrereq extends BasePrereq<SpellPrereqSchema> {
  static override defineSchema(): SpellPrereqSchema {
    return Object.assign(super.defineSchema(), spellPrereqSchema())
  }

  /* ---------------------------------------- */

  static override get TYPE(): PrereqType {
    return PrereqType.Spell
  }
}

/* ---------------------------------------- */

const spellPrereqSchema = () => {
  return {
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    subType: new fields.StringField({ required: false, nullable: true }),
    qualifier: new StringCriteriaField({ required: true, nullable: false }),
    quantity: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type SpellPrereqSchema = BasePrereqSchema & ReturnType<typeof spellPrereqSchema>

/* ---------------------------------------- */

export { SpellPrereq }
