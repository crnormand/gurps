import fields = foundry.data.fields
import TypeDataModel = foundry.abstract.TypeDataModel
import DataModel = foundry.abstract.DataModel

abstract class BaseItemData<Schema extends ItemDataSchema> extends TypeDataModel<Schema, Item.Implementation> {
  static override defineSchema(): ItemDataSchema {
    return itemDataSchema
  }

  /* ---------------------------------------- */

  abstract get component(): ItemComponent

  /* ---------------------------------------- */

  get contents(): Item.Implementation[] {
    const contents: Record<string, string> = this.component.contains || {}

    return Object.values(contents).reduce((acc: Item.Implementation[], id: string) => {
      const item = this.parent.actor?.items.get(id)
      if (item) acc.push(item)
      return acc
    }, [])
  }
}

/* ---------------------------------------- */

const itemDataSchema = {}

type ItemDataSchema = typeof itemDataSchema

/* ---------------------------------------- */

abstract class ItemComponent<Schema extends ItemComponentSchema = ItemComponentSchema> extends DataModel<Schema> {
  static override defineSchema(): ItemComponentSchema {
    return itemComponentSchema
  }
}

/* ---------------------------------------- */

const itemComponentSchema = {
  notes: new fields.StringField({ required: true, nullable: false }),
  pageref: new fields.StringField({ required: true, nullable: false }),
  // Change from previous schema. Set of IDs
  contains: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false }), {
    required: true,
    nullable: false,
  }),
  uuid: new fields.StringField({ required: true, nullable: false }),
  parentuuid: new fields.StringField({ required: true, nullable: false }),
  originalName: new fields.StringField({ required: true, nullable: false }),
}

type ItemComponentSchema = typeof itemComponentSchema

/* ---------------------------------------- */

export { BaseItemData, ItemComponent, type ItemDataSchema, type ItemComponentSchema }
