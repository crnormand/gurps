import { parselink } from 'lib/parselink.js'
import fields = foundry.data.fields
import TypeDataModel = foundry.abstract.TypeDataModel
import DataModel = foundry.abstract.DataModel
import { AnyObject } from 'fvtt-types/utils'

abstract class BaseItemData<Schema extends fields.DataSchema> extends TypeDataModel<Schema, Item.Implementation> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.SystemOfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.parent.type as Item.SubType)
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

  /* ---------------------------------------- */

  get enabled(): boolean {
    return true
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  applyBonuses(bonuses: AnyObject[]): void {}
}

/* ---------------------------------------- */

/**
 * CommonItemData is the base class used by all item types other than weapons.
 */
abstract class CommonItemData<Schema extends CommonItemDataSchema = CommonItemDataSchema> extends BaseItemData<Schema> {
  static override defineSchema(): CommonItemDataSchema {
    return commonItemDataSchema
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  // override prepareSiblingData(): void {
  //   super.prepareSiblingData()
  // }

  getGlobalBonuses(): AnyObject[] {
    if (this.isOfType('equipment') && !this.equipped) return []

    const bonuses = []

    for (let bonus of this.bonuses.split('\n')) {
      // Remove square brackets around OTF
      const internalOTF = bonus.match(/\[(.*)\]/)
      if (internalOTF) bonus = internalOTF[1].trim()

      const parsedOTF = parselink(bonus)
      if (parsedOTF.action) bonuses.push(parsedOTF.action)
    }

    return bonuses
  }
}

/* ---------------------------------------- */

// This Item schema is repeated in multiple places, so we define it here to avoid duplication
// It is NOT used for any weapon types, so we're not making all schemas extend from it
const commonItemDataSchema = {
  melee: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs corresponding to subtypes of Item
  ranged: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs corresponding to subtypes of Item
  ads: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs corresponding to subtypes of Item
  skills: new fields.SetField(new fields.StringField({ required: true, nullable: false })),
  // Change from previous schema. Set of IDs corresponding to subtypes of Item
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
  modifierTags: new fields.StringField({ required: true, nullable: false }),
}

type CommonItemDataSchema = typeof commonItemDataSchema

/* ---------------------------------------- */

abstract class ItemComponent<Schema extends ItemComponentSchema = ItemComponentSchema> extends DataModel<Schema> {
  static override defineSchema(): ItemComponentSchema {
    return itemComponentSchema
  }
}

/* ---------------------------------------- */

const itemComponentSchema = {
  name: new fields.StringField({ required: true, nullable: false }),
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
  // Change from previous schema. Previously Trait OTFs were stored on the trait item rather than the component
  checkotf: new fields.StringField({ required: true, nullable: false }),
  duringotf: new fields.StringField({ required: true, nullable: false }),
  passotf: new fields.StringField({ required: true, nullable: false }),
  failotf: new fields.StringField({ required: true, nullable: false }),
  consumeAction: new fields.BooleanField({ required: true, nullable: false }),
}

type ItemComponentSchema = typeof itemComponentSchema

/* ---------------------------------------- */

export {
  BaseItemData,
  CommonItemData,
  ItemComponent,
  commonItemDataSchema,
  type CommonItemDataSchema,
  type ItemComponentSchema,
}
