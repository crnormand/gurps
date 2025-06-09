import { CommonItemData, CommonItemDataSchema, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields

class SpellData extends CommonItemData<SpellSchema> {
  static override defineSchema(): SpellSchema {
    return {
      ...super.defineSchema(),
      ...spellSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): SpellComponent {
    return this.spl
  }
}

/* ---------------------------------------- */

class SpellComponent extends ItemComponent<SpellComponentSchema> {
  static override defineSchema(): SpellComponentSchema {
    return {
      ...super.defineSchema(),
      ...spellComponentSchema,
    }
  }
}

/* ---------------------------------------- */

const spellSchema = {
  spl: new fields.EmbeddedDataField(SpellComponent, { required: true, nullable: false }),
}

type SpellSchema = CommonItemDataSchema & typeof spellSchema

/* ---------------------------------------- */

const spellComponentSchema = {
  points: new fields.NumberField({ required: true, nullable: false }),
  import: new fields.StringField({ required: true, nullable: false }),
  level: new fields.NumberField({ required: true, nullable: false }),
  class: new fields.StringField({ required: true, nullable: false }),
  college: new fields.StringField({ required: true, nullable: false }),
  cost: new fields.StringField({ required: true, nullable: false }),
  maintain: new fields.StringField({ required: true, nullable: false }),
  duration: new fields.StringField({ required: true, nullable: false }),
  resist: new fields.StringField({ required: true, nullable: false }),
  casttime: new fields.StringField({ required: true, nullable: false }),
  difficulty: new fields.StringField({ required: true, nullable: false }),
  relativelevel: new fields.NumberField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
}

type SpellComponentSchema = ItemComponentSchema & typeof spellComponentSchema

/* ---------------------------------------- */

export { SpellData, type SpellSchema }
