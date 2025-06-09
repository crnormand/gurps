import { CommonItemData, CommonItemDataSchema, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields

class TraitData extends CommonItemData<TraitSchema> {
  static override defineSchema(): TraitSchema {
    return {
      ...super.defineSchema(),
      ...traitSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): TraitComponent {
    return this.fea
  }
}

/* ---------------------------------------- */

class TraitComponent extends ItemComponent<TraitComponentSchema> {
  static override defineSchema(): TraitComponentSchema {
    return {
      ...super.defineSchema(),
      ...traitComponentSchema,
    }
  }
}

/* ---------------------------------------- */

const traitSchema = {
  fea: new fields.EmbeddedDataField(TraitComponent, { required: true, nullable: false }),
}

type TraitSchema = CommonItemDataSchema & typeof traitSchema

/* ---------------------------------------- */

const traitComponentSchema = {
  level: new fields.NumberField({ required: true, nullable: false }),
  userdesc: new fields.StringField({ required: true, nullable: false }),
  points: new fields.NumberField({ required: true, nullable: false }),
  save: new fields.BooleanField({ required: true, nullable: false }),
  // itemid: new fields.StringField({ required: true, nullable: false }),
}

type TraitComponentSchema = ItemComponentSchema & typeof traitComponentSchema

/* ---------------------------------------- */

export { TraitData, type TraitSchema }
