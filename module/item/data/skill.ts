import { CommonItemData, CommonItemDataSchema, ItemComponent, ItemComponentSchema } from './base.js'
import fields = foundry.data.fields

class SkillData extends CommonItemData<SkillSchema> {
  static override defineSchema(): SkillSchema {
    return {
      ...super.defineSchema(),
      ...skillSchema,
    }
  }

  /* ---------------------------------------- */

  get component(): SkillComponent {
    return this.ski
  }
}

/* ---------------------------------------- */

class SkillComponent extends ItemComponent<SkillComponentSchema> {
  static override defineSchema(): SkillComponentSchema {
    return {
      ...super.defineSchema(),
      ...skillComponentSchema,
    }
  }
}

/* ---------------------------------------- */

const skillSchema = {
  ski: new fields.EmbeddedDataField(SkillComponent, { required: true, nullable: false }),
}

type SkillSchema = CommonItemDataSchema & typeof skillSchema

/* ---------------------------------------- */

const skillComponentSchema = {
  points: new fields.NumberField({ required: true, nullable: false }),
  import: new fields.StringField({ required: true, nullable: false }),
  level: new fields.NumberField({ required: true, nullable: false }),
  type: new fields.StringField({ required: true, nullable: false }),
  relativelevel: new fields.NumberField({ required: true, nullable: false }),
  otf: new fields.StringField({ required: true, nullable: false }),
}

type SkillComponentSchema = ItemComponentSchema & typeof skillComponentSchema

/* ---------------------------------------- */

export { SkillData, type SkillSchema }
