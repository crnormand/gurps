import { GcsElement } from './base.js'
import fields = foundry.data.fields

/* ---------------------------------------- */

class GcsAttribute extends GcsElement<AttributeData> {
  static override defineSchema(): AttributeData {
    return attributeData()
  }
}

/* ---------------------------------------- */

const attributeData = () => {
  return {
    attr_id: new fields.StringField({ required: true, nullable: false }),
    adj: new fields.NumberField({ required: true, nullable: false }),
    damage: new fields.NumberField({ required: true, nullable: true }),
    calc: new fields.SchemaField(
      {
        value: new fields.NumberField({ required: true, nullable: false }),
        current: new fields.NumberField({ required: true, nullable: true }),
        points: new fields.NumberField({ required: true, nullable: false }),
      },
      { required: true, nullable: false }
    ),
  }
}

type AttributeData = ReturnType<typeof attributeData>

/* ---------------------------------------- */

export { GcsAttribute, attributeData, type AttributeData }
