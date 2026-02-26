import { fields, TypeDataModel } from '@gurps-types/foundry/index.js'
import { BaseAction } from '@module/action/base-action.js'
import { parselink } from '@util/parselink.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAction } from '../../action/base-action.js'
import { AnyActionClass, MeleeAttackModel, RangedAttackModel } from '../../action/index.js'
import { CollectionField } from '../../data/fields/collection-field.js'
import { IContainable, containableSchema } from '../../data/mixins/containable.js'
import { ContainerUtils } from '../../data/mixins/container-utils.js'

import { ItemComponent } from './component.js'
import { ConditionalModifier, ReactionModifier } from './conditional-modifier.ts'

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
  /** A set of Item subtypes that this item can contain as children */
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

interface ItemBaseData extends AnyObject {
  melee: MeleeAttackModel[]
  ranged: RangedAttackModel[]
}

/* ---------------------------------------- */

abstract class BaseItemModel<Schema extends BaseItemModelSchema = BaseItemModelSchema>
  extends TypeDataModel<Schema, Item.Implementation, ItemBaseData>
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
      embedded: {
        ReactionModifier: 'system._reactions',
        ConditionalModifier: 'system._conditionalmods',
      },
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

  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent.actor || null
  }

  /* ---------------------------------------- */

  /**
   * Return the consolidated list of conditional modifiers provided by this item, combining any modifiers with the same
   * situation by summing their modifier values. This allows for multiple conditional modifiers to be applied to an item
   * without needing to manually combine them into a single modifier.
   */
  get conditionalmods(): ConditionalModifier[] {
    return this._conditionalmods.values().reduce((acc: ConditionalModifier[], condmod) => {
      const existingMod = acc.find(mod => mod.situation === condmod.situation)

      if (existingMod) existingMod.modifier += condmod.modifier
      else acc.push(condmod)

      return acc
    }, [])
  }

  /* ---------------------------------------- */

  /**
   * Return the consolidated list of reaction modifiers provided by this item, combining any modifiers with the same
   * situation by summing their modifier values. This allows for multiple reaction modifiers to be applied to an item
   * without needing to manually combine them into a single modifier.
   */
  get reactions(): ReactionModifier[] {
    return this._reactions.values().reduce((acc: ReactionModifier[], reaction) => {
      const existingMod = acc.find(mod => mod.situation === reaction.situation)

      if (existingMod) existingMod.modifier += reaction.modifier
      else acc.push(reaction)

      return acc
    }, [])
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
        .filter(item => item.system.containedBy === this.parent.id)
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
    return ContainerUtils.isContainedBy(this, container.system as BaseItemModel)
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

  /**
   * Return the contained items of this container, filtered by the allowed child types defined in the system metadata. This is used to
   * determine which items should be displayed as children in the UI, and which items should be considered modifiers.
   * For example, Trait Containers (of type "featureV2") should store child traits as children, but trait modifiers
   * (when implemented) should be stored as modifiers.
   */
  get children(): Item.Implementation[] {
    return this.contents.filter(contentItem => this.metadata.childTypes.includes(contentItem.type))
  }

  /* ---------------------------------------- */

  /**
   * Return the contained items of this container, filtered by the allowed modifier types defined in the system
   * metadata. This is used to determine which items should be displayed as modifiers in the UI, and which items should
   * be considered children.
   */
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
    this.melee = this.actions.filter(action => action.isOfType(ActionType.MeleeAttack))
    this.ranged = this.actions.filter(action => action.isOfType(ActionType.RangedAttack))

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
    /** Include containable functionality */
    ...containableSchema(),

    /** The ModelCollection for an Item's Actions, which includes Melee and Ranged Attacks. */
    actions: new CollectionField(BaseAction as AnyActionClass),

    /**
     * Is this Item a container that can hold other items? This should be toggleable in the UI for any Item,
     * and allows for empty containers Items, which the previous accessor value based on the presence of contained
     * Items did not.
     */
    isContainer: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    /** Is this Item active? This determined whether bonuses provided by the Item are applied to the Actor. */
    disabled: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    /** An OTF field listing bonuses applied by the Item. */
    bonuses: new fields.StringField({ required: true, nullable: false }),

    /** An OTF field listing modifiers applied by the Item. */
    itemModifiers: new fields.StringField({ required: true, nullable: false }),

    /** Should this Item show up in the quick roll menu in the combat tracker? */
    addToQuickRoll: new fields.BooleanField({ required: true, nullable: false }),

    /** Which modifier tags should automatically apply to this Item? */
    modifierTags: new fields.StringField({ required: true, nullable: false }),

    /** Reaction Bonuses applied by this Item. */
    _reactions: new CollectionField(ReactionModifier),

    /** Conditional Modifiers applied by this Item. */
    _conditionalmods: new CollectionField(ConditionalModifier),
  }
}

type BaseItemModelSchema = ReturnType<typeof baseItemModelSchema>

/* ---------------------------------------- */

export { BaseItemModel, type BaseItemModelSchema, type ItemMetadata }
