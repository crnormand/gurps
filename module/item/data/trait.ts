import { BaseItemModel, BaseItemModelSchema } from './base.js'
import { ItemComponent, ItemComponentSchema } from './component.js'
import fields = foundry.data.fields

class TraitData extends BaseItemModel<TraitSchema> {
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

type TraitSchema = BaseItemModelSchema & typeof traitSchema

/* ---------------------------------------- */

const traitComponentSchema = {
  level: new fields.NumberField({ required: true, nullable: false }),
  // Change from previous schema. "note" is no longer used, and userdesc and notes are kept separate.
  userdesc: new fields.StringField({ required: true, nullable: false }),
  points: new fields.NumberField({ required: true, nullable: false }),
  cr: new fields.NumberField({ required: true, nullable: true }),
}

type TraitComponentSchema = ItemComponentSchema & typeof traitComponentSchema

/* ---------------------------------------- */

export { TraitData, type TraitSchema }
