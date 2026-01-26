import { fields } from '../../types/foundry/index.js'

import { BasePrereqModel, BasePrereqSchema } from './base.ts'

class AttributePrereq extends BasePrereqModel<AttributePrereqSchema> {
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
    which: new fields.StringField({ required: true, nullable: false, choices: [] }),
  }
}

type AttributePrereqSchema = ReturnType<typeof attributePrereqSchema> & BasePrereqSchema

/* ---------------------------------------- */

export { AttributePrereq }
