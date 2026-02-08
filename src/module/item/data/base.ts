import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'
import { parselink } from '@util/parselink.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction } from '../../action/base-action.js'
import { MeleeAttackModel, RangedAttackModel } from '../../action/index.js'
import { reactionSchema } from '../../actor/data/character-components.js'
import { CollectionField } from '../../data/fields/collection-field.js'
import { IContainable, containableSchema } from '../../data/mixins/containable.js'
import { ContainerUtils } from '../../data/mixins/container-utils.js'

import { ItemComponent } from './component.js'

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
  actions: Record<string, (...args: any[]) => any>
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

abstract class BaseItemModel<Schema extends BaseItemModelSchema = BaseItemModelSchema>
  extends TypeDataModel<Schema, Item.Implementation>
  implements IContainable<Item.Implementation>
{
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
  /*  IContainable Interface Implementation   */
  /* ---------------------------------------- */

  get id(): string {
    return this.parent.id ?? ''
  }

  get container(): Item.Implementation | null {
    return this.parent.actor?.items.get(this.containedBy ?? '') || null
  }

  /* ---------------------------------------- */

  get isContained(): boolean {
    return ContainerUtils.isContained(this)
  }

  get contents(): Item.Implementation[] {
    return (
      this.parent.actor?.items.contents
        .filter(item => (item.system as BaseItemModel).containedBy === this.parent.id)
        .sort((left, right) => left.sort - right.sort) || []
    )
  }

  get allContents(): Item.Implementation[] {
    return ContainerUtils.getAllContents(this)
  }

  get containerDepth(): number {
    return ContainerUtils.getContainerDepth(this)
  }

  /**
   * Check if this container contains the specified item (directly or indirectly)
   */
  containsItem(item: Item.Implementation): boolean {
    return ContainerUtils.containsItem(this, item)
  }

  get ancestors(): Item.Implementation[] {
    return ContainerUtils.getAncestors(this)
  }

  /**
   * Get all descendants with optional filtering
   */
  getDescendants(filter?: (item: Item.Implementation) => boolean): Item.Implementation[] {
    return ContainerUtils.getDescendants(this, filter)
  }

  /**
   * Check if this item is contained by (directly or indirectly) the specified container
   */
  isContainedBy(container: Item.Implementation): boolean {
    return ContainerUtils.isContainedBy(this, container.system as IContainable<Item.Implementation>)
  }

  /**
   * Toggle the open/collapsed state of this container
   */
  async toggleOpen(expandOnly: boolean = false): Promise<void> {
    if (expandOnly && this.open) return

    const newValue = !this.open

    await this.parent.update({ 'system.open': newValue } as Item.UpdateData)
  }

  /* ---------------------------------------- */

  get isContainer(): boolean {
    return this.contents.length > 0
  }

  // TODO I'm not sure what this is trying to do.
  get children(): Item.Implementation[] {
    return this.contents.filter(contentItem => this.metadata.childTypes.includes(contentItem.type))
  }

  /* ---------------------------------------- */

  get modifiers(): Item.Implementation[] {
    return this.contents.filter(contentItem => this.metadata.modifierTypes.includes(contentItem.type))
  }

  /* ---------------------------------------- */

  get enabled(): boolean {
    return !this.disabled
  }

  /* ---------------------------------------- */

  applyBonuses(bonuses: AnyObject[]): void {
    for (const action of this.actions) {
      action.applyBonuses(bonuses)
    }
  }

  /* ---------------------------------------- */

  async toggleEnabled(_enabled: boolean | null = null): Promise<this['parent'] | undefined> {
    console.warn(`Item of type "${this.parent.type}" cannot be toggled.`)

    return this.parent
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
    // Include containable functionality
    ...containableSchema(),

    // Change from previous schema. Boolean value to indicate if item is container
    // TODO Can this be derived?
    // isContainer: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),

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

export { BaseItemModel, type BaseItemModelSchema, type ItemMetadata }
