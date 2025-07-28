import { BaseItemModel, BaseItemModelSchema } from './base.js'
import { ItemComponent, ItemComponentSchema } from './component.js'
import fields = foundry.data.fields
import { AnyMutableObject } from 'fvtt-types/utils'

class TraitModel extends BaseItemModel<TraitSchema> {
  static override defineSchema(): TraitSchema {
    return {
      ...super.defineSchema(),
      ...traitSchema(),
    }
  }

  /* ---------------------------------------- */

  get component(): TraitComponent {
    return this.fea
  }

  /* ---------------------------------------- */

  static override migrateData(source: AnyMutableObject): AnyMutableObject {
    super.migrateData(source)
    if (source.import) source.level ??= source.import || null

    return source
  }
}

/* ---------------------------------------- */

class TraitComponent extends ItemComponent<TraitComponentSchema> {
  static override defineSchema(): TraitComponentSchema {
    return {
      ...super.defineSchema(),
      ...traitComponentSchema(),
    }
  }
}

/* ---------------------------------------- */

const traitSchema = () => {
  return {
    fea: new fields.EmbeddedDataField(TraitComponent, { required: true, nullable: false }),
  }
}

type TraitSchema = BaseItemModelSchema & ReturnType<typeof traitSchema>

/* ---------------------------------------- */

const traitComponentSchema = () => {
  return {
    level: new fields.NumberField({ required: true, nullable: true }),
    // Change from previous schema. "note" is no longer used, and userdesc and notes are kept separate.
    userdesc: new fields.StringField({ required: true, nullable: false }),
    points: new fields.NumberField({ required: true, nullable: false }),
    cr: new fields.NumberField({ required: true, nullable: true }),
  }
}

type TraitComponentSchema = ItemComponentSchema & ReturnType<typeof traitComponentSchema>

/* ---------------------------------------- */

export { TraitModel, type TraitSchema, TraitComponent, type TraitComponentSchema }
