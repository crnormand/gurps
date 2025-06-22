import fields = foundry.data.fields
import TypeDataModel = foundry.abstract.TypeDataModel
import { AnyObject } from 'fvtt-types/utils'

import { ItemComponent } from './component.js'
import { parselink } from '../../../lib/parselink.js'
import { MeleeAttack, RangedAttack } from '../../action/index.js'
import { CollectionField } from '../../data/fields/collection-field.js'
import { BaseAction } from '../../action/base-action.js'

type ItemMetadata = Readonly<{
  /** The expected `type` value */
  type: string
  /** Actor types that this item cannot be placed on */
  invalidActorTypes: string[]
  /** Are there any partials to fill in the Details tab of the item? */
  detailsPartial?: string[]
  /* Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
}>

/* ---------------------------------------- */

abstract class BaseItemModel<Schema extends BaseItemModelSchema = BaseItemModelSchema> extends TypeDataModel<
  Schema,
  Item.Implementation
> {
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.SystemOfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.parent.type as Item.SubType)
  }

  /* ---------------------------------------- */

  static get metadata(): ItemMetadata {
    return {
      embedded: {},
      type: 'base',
      invalidActorTypes: [],
    }
  }

  /* ---------------------------------------- */

  get metadata(): ItemMetadata {
    return (this.constructor as typeof BaseItemModel).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): BaseItemModelSchema {
    return baseItemModelSchema()
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
    const contents: string[] = this.component.contains || []

    return contents.reduce((acc: Item.Implementation[], id: string) => {
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
    for (const action of this.actions) {
      if (action instanceof MeleeAttack || action instanceof RangedAttack) action.applyBonuses(bonuses)
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
}

/* ---------------------------------------- */

// This Item schema is repeated in multiple places, so we define it here to avoid duplication
// It is NOT used for any weapon types, so we're not making all schemas extend from it
const baseItemModelSchema = () => {
  return {
    // Change from previous schema. Actions are consolidated, then split into melee and ranged when instantiated
    actions: new CollectionField(BaseAction),
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
}

type BaseItemModelSchema = ReturnType<typeof baseItemModelSchema>

/* ---------------------------------------- */

export { BaseItemModel, ItemComponent, baseItemModelSchema, type BaseItemModelSchema }
