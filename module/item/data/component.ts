import { DataModel, fields } from '../../types/foundry/index.js'

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
    // NOTE: Replaced by "containedBy" in BaseItemModelSchema. The new implementation stores the parent ID on each
    // child, instead of the parent having a list of children.
    // contains: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), {
    //   required: true,
    //   nullable: false,
    // }),

    vtt_notes: new fields.StringField({ required: true, nullable: true, initial: null }),

    uuid: new fields.StringField({ required: true, nullable: false }),
    parentuuid: new fields.StringField({ required: true, nullable: false }),
    originalName: new fields.StringField({ required: true, nullable: false }),

    // Import tracking fields
    importFrom: new fields.StringField({ required: true, nullable: false, initial: '' }),
    importid: new fields.StringField({ required: true, nullable: false, initial: '' }),
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
