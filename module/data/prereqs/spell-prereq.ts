import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'
import { StringCriteriaField } from '../criteria/string-criteria.ts'

import { BasePrereq, basePrereqSchema } from './base-prereq.ts'

class SpellPrereq extends BasePrereq<SpellPrereqSchema> {
  static override defineSchema(): SpellPrereqSchema {
    return spellPrereqSchema()
  }
}

/* ---------------------------------------- */

const spellPrereqSchema = () => {
  return {
    ...basePrereqSchema(),
    has: new fields.BooleanField({ required: true, nullable: false, initial: true }),
    subType: new fields.StringField({ required: false, nullable: true }),
    qualifier: new StringCriteriaField({ required: true, nullable: false }),
    quantity: new NumberCriteriaField({ required: true, nullable: false }),
  }
}

type SpellPrereqSchema = ReturnType<typeof spellPrereqSchema>

/* ---------------------------------------- */

export { SpellPrereq }
