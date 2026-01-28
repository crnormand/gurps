import { fields } from '../../types/foundry/index.js'
import { NumberCriteriaField } from '../criteria/number-criteria.ts'

import { BasePrereq, BasePrereqSchema } from './base-prereq.ts'

class AttributePrereq extends BasePrereq<AttributePrereqSchema> {
  static override defineSchema(): AttributePrereqSchema {
    return {
      ...super.defineSchema(),
      ...attributePrereqSchema(),
    }
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

type AttributePrereqSchema = ReturnType<typeof attributePrereqSchema> & BasePrereqSchema

/* ---------------------------------------- */

export { AttributePrereq }
