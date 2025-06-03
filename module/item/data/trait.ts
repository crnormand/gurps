import { ItemComponent, ItemComponentSchema, ItemDataSchema } from './base.js'
import fields = foundry.data.fields

class TraitData extends foundry.abstract.TypeDataModel<TraitSchema, Item.Implementation> {
  static override defineSchema(): TraitSchema {
    return traitSchema
  }

  /* ---------------------------------------- */

  get contents(): Item.Implementation[] {
    const contents: Record<string, string> = this.eqt?.contains

    return Object.values(contents).reduce((acc: Item.Implementation[], id: string) => {
      const item = this.parent.actor?.items.get(id)
      if (item) acc.push(item)
      return acc
    }, [])
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

const traitSchema = {}

type TraitSchema = ItemDataSchema & typeof traitSchema

/* ---------------------------------------- */

const traitComponentSchema = {
  level: new fields.NumberField({ required: true, nullable: false }),
  userdesc: new fields.StringField({ required: true, nullable: false }),
  note: new fields.StringField({ required: true, nullable: false }),
  points: new fields.NumberField({ required: true, nullable: false }),
  save: new fields.BooleanField({ required: true, nullable: false }),
  itemid: new fields.StringField({ required: true, nullable: false }),
}

type TraitComponentSchema = ItemComponentSchema & typeof traitComponentSchema

/* ---------------------------------------- */

export { TraitData, type TraitSchema }
