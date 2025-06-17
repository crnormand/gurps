import fields = foundry.data.fields
import TypeDataModel = foundry.abstract.TypeDataModel
import { AnyObject } from 'fvtt-types/utils'

import { ItemComponent } from './component.js'
import { parselink } from '../../../lib/parselink.js'
import { ActionCollectionField, MeleeAttack, RangedAttack } from '../../action/index.js'

abstract class BaseItemData<Schema extends BaseItemDataSchema = BaseItemDataSchema> extends TypeDataModel<
  Schema,
  Item.Implementation
> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.SystemOfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.parent.type as Item.SubType)
  }

  /* ---------------------------------------- */

  static override defineSchema(): BaseItemDataSchema {
    return baseItemDataSchema
  }

  /* ---------------------------------------- */
  /*  Instance properties                     */
  /* ---------------------------------------- */

  declare melee: MeleeAttack[]
  declare ranged: RangedAttack[]

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

  applyBonuses(bonuses: AnyObject[]): void {
    for (const attack of [...this.melee, ...this.ranged]) {
      attack.applyBonuses(bonuses)
    }
  }

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()

    this.actions.forEach(action => {
      action.prepareBaseData()
    })
  }

  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()

    for (const attack of [...this.melee, ...this.ranged]) {
      attack.prepareDerivedData()
    }
  }

  /* ---------------------------------------- */

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

  testFunc() {
    const a = this.actions
  }
}

/* ---------------------------------------- */

// This Item schema is repeated in multiple places, so we define it here to avoid duplication
// It is NOT used for any weapon types, so we're not making all schemas extend from it
const baseItemDataSchema = {
  // Change from previous schema. Actions are consolidated, then split into melee and ranged when instantiated
  actions: new ActionCollectionField(),
  // // Change from previous schema. Array instead of object
  // melee: new fields.ArrayField(new fields.EmbeddedDataField(MeleeAttack, { required: true, nullable: false }), {
  //   required: true,
  //   nullable: false,
  // }),
  // // Change from previous schema. Array instead of object
  // ranged: new fields.ArrayField(new fields.EmbeddedDataField(RangedAttack, { required: true, nullable: false }), {
  //   required: true,
  //   nullable: false,
  // }),
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

type BaseItemDataSchema = typeof baseItemDataSchema

/* ---------------------------------------- */

export { BaseItemData, ItemComponent, baseItemDataSchema, type BaseItemDataSchema }
