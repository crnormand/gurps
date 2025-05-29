import fields = foundry.data.fields

class EquipmentData extends foundry.abstract.TypeDataModel<EquipmentSchema, Item.Implementation> {
  static override defineSchema(): EquipmentSchema {
    return equipmentSchema
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

class EquipmentComponent extends foundry.abstract.DataModel<EquipmentComponentSchema> {
  constructor(...args: foundry.abstract.DataModel.ConstructorArgs<EquipmentComponentSchema>) {
    super(...args)
  }

  static override defineSchema(): EquipmentComponentSchema {
    return equipmentComponentSchema
  }
}

/* ---------------------------------------- */

const equipmentSchema = {
  eqt: new fields.EmbeddedDataField(EquipmentComponent, { required: true, nullable: false }),
  // Change from previous schema. Set of IDs
  melee: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs
  ranged: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs
  ads: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs
  skills: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs
  spells: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  bonuses: new fields.StringField({ required: true, nullable: false }),
  itemModifiers: new fields.StringField({ required: true, nullable: false }),
  equipped: new fields.BooleanField({ required: true, nullable: false }),
  carried: new fields.BooleanField({ required: true, nullable: false }),
  globalid: new fields.StringField({ required: true, nullable: false }),
  importid: new fields.StringField({ required: true, nullable: false }),
  importFrom: new fields.StringField({ required: true, nullable: false }),
  fromItem: new fields.StringField({ required: true, nullable: false }),
  addToQuickRoll: new fields.BooleanField({ required: true, nullable: false }),
}

type EquipmentSchema = typeof equipmentSchema

/* ---------------------------------------- */

const equipmentComponentSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
  notes: new fields.StringField({ required: true, nullable: false }),
  pageref: new fields.StringField({ required: true, nullable: false }),
  count: new fields.NumberField({ required: true, nullable: false }),
  weight: new fields.NumberField({ required: true, nullable: false }),
  cost: new fields.NumberField({ required: true, nullable: false }),
  location: new fields.StringField({ required: true, nullable: false }),
  carried: new fields.BooleanField({ required: true, nullable: false }),
  equipped: new fields.BooleanField({ required: true, nullable: false }),
  techlevel: new fields.StringField({ required: true, nullable: false }),
  categories: new fields.StringField({ required: true, nullable: false }),
  legalityclass: new fields.StringField({ required: true, nullable: false }),
  costsum: new fields.NumberField({ required: true, nullable: false }),
  weightsum: new fields.NumberField({ required: true, nullable: false }),
  uses: new fields.StringField({ required: true, nullable: false }),
  maxuses: new fields.StringField({ required: true, nullable: false }),
  parentuuid: new fields.StringField({ required: true, nullable: false }),
  uuid: new fields.StringField({ required: true, nullable: false }),
  // Change from previous schema. Set of IDs
  contains: new fields.TypedObjectField(new fields.StringField({ required: true, nullable: false }), {
    required: true,
    nullable: false,
  }),
  originalName: new fields.StringField({ required: true, nullable: false }),
  originalCount: new fields.StringField({ required: true, nullable: false }),
  ignoreImportQty: new fields.BooleanField({ required: true, nullable: false }),
}

type EquipmentComponentSchema = typeof equipmentComponentSchema

/* ---------------------------------------- */

export { EquipmentData, type EquipmentSchema }
