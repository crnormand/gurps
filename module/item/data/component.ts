import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

abstract class ItemComponent<Schema extends ItemComponentSchema = ItemComponentSchema> extends DataModel<Schema> {
  static override defineSchema(): ItemComponentSchema {
    return itemComponentSchema()
  }
}

/* ---------------------------------------- */

const itemComponentSchema = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    pageref: new fields.StringField({ required: true, nullable: false }),
    // Change from previous schema. Set of IDs
    // NOTE: this method of storing child items overrides Foundry's default "sort" behaviour.
    // TODO: look into using a different method of storing child items such as storing the parent ID on the child item only.
    contains: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    uuid: new fields.StringField({ required: true, nullable: false }),
    parentuuid: new fields.StringField({ required: true, nullable: false }),
    originalName: new fields.StringField({ required: true, nullable: false }),
    // Change from previous schema. Previously Trait OTFs were stored on the trait item rather than the component
    checkotf: new fields.StringField({ required: true, nullable: false }),
    duringotf: new fields.StringField({ required: true, nullable: false }),
    passotf: new fields.StringField({ required: true, nullable: false }),
    failotf: new fields.StringField({ required: true, nullable: false }),
    consumeAction: new fields.BooleanField({ required: true, nullable: false }),
  }
}

type ItemComponentSchema = ReturnType<typeof itemComponentSchema>

/* ---------------------------------------- */

export { ItemComponent, type ItemComponentSchema }
