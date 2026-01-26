import { DataModel, fields } from '../../types/foundry/index.js'

class BasePrereqModel<Schema extends BasePrereqSchema> extends DataModel<Schema> {
  static override defineSchema(): BasePrereqSchema {
    return basePrereqSchema()
  }
}

/* ---------------------------------------- */

const basePrereqSchema = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false }),
  }
}

type BasePrereqSchema = ReturnType<typeof basePrereqSchema>

/* ---------------------------------------- */

export { BasePrereqModel, type BasePrereqSchema }
