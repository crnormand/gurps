import { fields, DataModel } from '../../types/foundry/index.ts'

class GcsAttribute extends DataModel<GcsAttributeSchema> {
  static override defineSchema(): GcsAttributeSchema {
    return gcsAttributeSchema()
  }
}

const gcsAttributeSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    adj: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.NumberField({ required: true, nullable: true }),
  }
}

type GcsAttributeSchema = ReturnType<typeof gcsAttributeSchema>

/* ---------------------------------------- */

export { GcsAttribute }
