import { NumberCriteriaField } from '../data/criteria/number-criteria.ts'
import { StringCriteriaField } from '../data/criteria/string-criteria.ts'
import { fields } from '../types/foundry/index.ts'

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
