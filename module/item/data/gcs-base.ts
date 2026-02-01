import { BaseAction } from '../../action/base-action.ts'
import { CollectionField } from '../../data/fields/collection-field.ts'
import { IContainable, containableSchema } from '../../data/mixins/containable.ts'
import { ContainerUtils } from '../../data/mixins/container-utils.ts'
import { fields, TypeDataModel } from '../../types/foundry/index.ts'

type GcsItemMetadata = Readonly<{
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

abstract class GcsBaseItemModel<Schema extends GcsBaseItemSchema = GcsBaseItemSchema>
  extends TypeDataModel<Schema, Item.Implementation>
  implements IContainable<Item.Implementation>
{
  /* ---------------------------------------- */

  isOfType<SubType extends Item.SubType>(...types: SubType[]): this is Item.SystemOfType<SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.parent.type as Item.SubType)
  }

  /* ---------------------------------------- */

  static get metadata(): GcsItemMetadata {
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

  get metadata(): GcsItemMetadata {
    return (this.constructor as typeof GcsBaseItemModel).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsBaseItemSchema {
    return gcsBaseItemSchema()
  }

  /* ---------------------------------------- */
  /*  Instance properties                     */
  /* ---------------------------------------- */

  get item(): Item.Implementation {
    return this.parent as Item.Implementation
  }

  /* ---------------------------------------- */

  get actor(): Actor.Implementation | null {
    return this.parent.actor || null
  }

  /* ---------------------------------------- */
  /*  IContainable Interface Implementation   */
  /* ---------------------------------------- */

  get id(): string {
    return this.parent.id ?? ''
  }

  /* ---------------------------------------- */

  get container(): Item.Implementation | null {
    return this.parent.actor?.items.get(this.containedBy ?? '') || null
  }

  /* ---------------------------------------- */

  get isContained(): boolean {
    return ContainerUtils.isContained(this)
  }

  /* ---------------------------------------- */

  get contents(): Item.Implementation[] {
    return (
      this.parent.actor?.items.contents
        .filter(item => (item.system as GcsBaseItemModel).containedBy === this.parent.id)
        .sort((a, b) => a.sort - b.sort) || []
    )
  }

  /* ---------------------------------------- */

  get allContents(): Item.Implementation[] {
    return ContainerUtils.getAllContents(this)
  }

  /* ---------------------------------------- */

  get containerDepth(): number {
    return ContainerUtils.getContainerDepth(this)
  }

  /* ---------------------------------------- */

  containsItem(item: Item.Implementation): boolean {
    return ContainerUtils.containsItem(this, item)
  }

  /* ---------------------------------------- */

  get ancestors(): Item.Implementation[] {
    return ContainerUtils.getAncestors(this)
  }

  /* ---------------------------------------- */

  getDescendants(filter?: (item: Item.Implementation) => boolean): Item.Implementation[] {
    return ContainerUtils.getDescendants(this, filter)
  }

  /* ---------------------------------------- */

  isContainedBy(container: Item.Implementation): boolean {
    return ContainerUtils.isContainedBy(this, container.system as IContainable<Item.Implementation>)
  }

  /* ---------------------------------------- */

  async toggleOpen(expandOnly: boolean = false): Promise<void> {
    if (expandOnly && this.open) return

    const newValue = !this.open

    await this.parent.update({ 'system.open': newValue } as Item.UpdateData)
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

  async toggleEnabled(_enabled: boolean | null = null): Promise<this['parent'] | undefined> {
    console.warn(`Item of type "${this.parent.type}" cannot be toggled.`)

    return this.parent
  }

  /* ---------------------------------------- */
  /*  Item Use base implementation            */
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
  /*  Legacy Parity                           */
  /* ---------------------------------------- */

  // These functions and accessors currently exist only for the sake of parity with older item data models,
  // but otherwise remain as stubs to be implemented later.

  get itemModifiers(): string {
    return ''
  }
}

/* ---------------------------------------- */

// This Item schema is repeated in multiple places, so we define it here to avoid duplication
// It is NOT used for any weapon types, so we're not making all schemas extend from it
const gcsBaseItemSchema = () => {
  return {
    // Include containable functionality
    ...containableSchema(),

    tid: new fields.DocumentIdField({ required: true, nullable: false, initial: () => foundry.utils.randomID() }),
    // NOTE: Not currently used in GGA, just for GCS parity
    source: new fields.SchemaField(
      {
        // Library string `json:"library"`
        // Path    string `json:"path"`
        // TID tid.TID `json:"id"`
        library: new fields.StringField({ required: true, nullable: false }),
        path: new fields.StringField({ required: true, nullable: false }),
        id: new fields.StringField({ required: true, nullable: false }),
      },
      { required: true, nullable: true }
    ),
    reference: new fields.StringField({ required: true, nullable: false }),
    referenceHighlight: new fields.StringField({ required: true, nullable: false }),
    thirdParty: new fields.ObjectField({ required: true, nullable: false }),

    actions: new CollectionField(BaseAction),
    isContainer: new fields.BooleanField({ required: true, nullable: false, initial: false }),
  }
}

type GcsBaseItemSchema = ReturnType<typeof gcsBaseItemSchema>

/* ---------------------------------------- */

export { GcsBaseItemModel, gcsBaseItemSchema, type GcsBaseItemSchema, type GcsItemMetadata }
