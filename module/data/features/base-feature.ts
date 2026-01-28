import { DataModel, fields } from '../../types/foundry/index.ts'

class BaseFeatureModel<Schema extends BaseFeatureSchema> extends DataModel<Schema> {
  static override defineSchema(): BaseFeatureSchema {
    return baseFeatureSchema()
  }
}

/* ---------------------------------------- */

const baseFeatureSchema = (options: { type: string } = { type: 'base' }) => {
  return {
    type: new fields.StringField({ required: true, nullable: false, blank: false, initial: options.type }),
  }
}

type BaseFeatureSchema = ReturnType<typeof baseFeatureSchema>

/* ---------------------------------------- */

export { BaseFeatureModel, baseFeatureSchema, type BaseFeatureSchema }
