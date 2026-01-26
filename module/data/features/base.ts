import { DataModel, fields } from '../../types/foundry/index.js'

class BaseFeatureModel<Schema extends BaseFeatureSchema> extends DataModel<Schema> {
  static override defineSchema(): BaseFeatureSchema {
    return baseFeatureSchema()
  }
}

/* ---------------------------------------- */

const baseFeatureSchema = () => {
  return {
    type: new fields.StringField({ required: true, nullable: false }),
  }
}

type BaseFeatureSchema = ReturnType<typeof baseFeatureSchema>

/* ---------------------------------------- */

export { BaseFeatureModel, type BaseFeatureSchema }
