import { DataModel, fields } from '../../types/foundry/index.ts'

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

export { BaseFeatureModel, baseFeatureSchema, type BaseFeatureSchema }
