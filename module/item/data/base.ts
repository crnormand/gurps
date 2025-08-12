import fields = foundry.data.fields
import TypeDataModel = foundry.abstract.TypeDataModel
import { AnyObject } from 'fvtt-types/utils'

import { ItemComponent } from './component.js'
import { parselink } from '../../../lib/parselink.js'
import { MeleeAttackModel, RangedAttackModel } from '../../action/index.js'
import { CollectionField } from '../../data/fields/collection-field.js'
import { BaseAction } from '../../action/base-action.js'
import { reactionSchema } from '../../actor/data/character-components.js'

type ItemMetadata = Readonly<{
  /** The expected `type` value */
  type: string
  /** Actor types that this item cannot be placed on */
  invalidActorTypes: string[]
  /** Are there any partials to fill in the Details tab of the item? */
  detailsPartial?: string[]
  /** Record of document names of pseudo-documents and the path to the collection. */
  embedded: Record<string, string>
  /** Record of actions the item can perform */
  actions: Record<string, Function>
  /** A set of Item subtypes that this item cna contain as children */
  childTypes: string[]
  /** A set of Item subtypes that this item can contain as modifiers */
  modifierTypes: string[]
}>

/* ---------------------------------------- */

type ItemUseOptions = {
  /** The action to perform */
  action?: string
  /** The user initiating the use action */
  user?: User.Implementation
  /** The actor object passed to the use function */
  actor?: Actor.Implementation
}

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
      actions: {},
      childTypes: [],
      modifierTypes: [],
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

  melee: MeleeAttackModel[] = []
  ranged: RangedAttackModel[] = []

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent.actor || null
  }

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

  get children(): Item.Implementation[] {
    return this.contents.filter(e => this.metadata.childTypes.includes(e.type))
  }

  /* ---------------------------------------- */

  get modifiers(): Item.Implementation[] {
    return this.contents.filter(e => this.metadata.modifierTypes.includes(e.type))
  }

  /* ---------------------------------------- */

  get allContents(): Item.Implementation[] {
    const contents = this.contents
    const otherContents = contents.flatMap(i => i.allContents || [])
    return [...contents, ...otherContents]
  }

  /* ---------------------------------------- */

  get enabled(): boolean {
    return true
  }

  /* ---------------------------------------- */

  get container(): Item.Implementation | null {
    return (
      this.actor?.items.find(
        item => item.system instanceof BaseItemModel && item.system.component.contains.includes(this.parent.id ?? '')
      ) ?? null
    )
  }

  /* ---------------------------------------- */

  get isContained(): boolean {
    return !!this.container
  }

  /* ---------------------------------------- */
  get containerDepth(): number {
    if (!this.isContained) return 0
    return 1 + (this.container?.system as BaseItemModel).containerDepth
  }

  /* ---------------------------------------- */

  applyBonuses(bonuses: AnyObject[]): void {
    for (const action of this.actions) {
      if (action instanceof MeleeAttackModel || action instanceof RangedAttackModel) action.applyBonuses(bonuses)
    }
  }

  /* ---------------------------------------- */

  use(options: ItemUseOptions = {}) {
    if (options.action && options.action in this.metadata.actions) {
      const actionFn = this.metadata.actions[options.action]
      if (typeof actionFn === 'function') {
        return actionFn.call(this, options)
      }
    } else {
      console.warn(`No action found for ${options.action} in item ${this.parent.name} (${this.parent.id})`)
    }
  }

  /* ---------------------------------------- */

  protected override async _onDelete(
    options: Item.Database.OnDeleteOperation & { deleteContents?: boolean },
    userId: string
  ): Promise<void> {
    super._onDelete(options, userId)
    if (userId !== game.user?.id || !options.deleteContents) return

    // Delete a container's contents when it is deleted
    const contents = this.allContents
    if (contents.length > 0) {
      await Item.deleteDocuments(Array.from(contents.map(i => i.id!)), options)
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

    this.actions.forEach(action => {
      action.prepareDerivedData()
    })
  }

  /* ---------------------------------------- */

  getGlobalBonuses(): AnyObject[] {
    if (this.isOfType('equipment') && !this.component.equipped) return []

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
    // Change from previous schema. Boolean value to indicate if item is container
    isContainer: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    // Change from previous schema. Boolean indicating whether item is open
    open: new fields.BooleanField({ required: true, nullable: true, initial: true }),
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
    globalid: new fields.StringField({ required: true, nullable: false }),
    importid: new fields.StringField({ required: true, nullable: false }),
    importFrom: new fields.StringField({ required: true, nullable: false }),
    fromItem: new fields.StringField({ required: true, nullable: false }),
    addToQuickRoll: new fields.BooleanField({ required: true, nullable: false }),
    modifierTags: new fields.StringField({ required: true, nullable: false }),
    reactions: new fields.ArrayField(new fields.SchemaField(reactionSchema(), { required: true, nullable: false }), {
      required: true,
      nullable: false,
    }),
    conditionalmods: new fields.ArrayField(
      new fields.SchemaField(reactionSchema(), { required: true, nullable: false }),
      { required: true, nullable: false }
    ),
  }
}

type BaseItemModelSchema = ReturnType<typeof baseItemModelSchema>

/* ---------------------------------------- */

export {
  BaseItemModel,
  ItemComponent,
  baseItemModelSchema,
  type BaseItemModelSchema,
  type ItemMetadata,
  type ItemUseOptions,
}
