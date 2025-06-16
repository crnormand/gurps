import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

type ActionMetadata<Type extends string = 'base'> = {
  name: string
  type: Type
}

/* ---------------------------------------- */

class BaseAction<Schema extends BaseActionSchema = BaseActionSchema> extends DataModel<Schema, DataModel.Any | null> {
  constructor(data: fields.SchemaField.CreateData<Schema>, context: DataModel.ConstructionContext) {
    super(data, context)
  }

  /* ---------------------------------------- */

  /**
   * Mapping of Action UUID to the apps they should re-render.
   * @internal
   * @type {Map<string, Set<Application|ApplicationV2>>}
   */
  static _apps: Map<string, Set<foundry.applications.api.ApplicationV2>> = new Map()

  /* ---------------------------------------- */

  /**
   * Existing sheets of a specific type for a specific action.
   * @type {Map<[PseudoDocument, typeof ApplicationV2], ApplicationV2>}
   */
  static _sheets: Map<
    [BaseAction, typeof foundry.applications.api.ApplicationV2],
    foundry.applications.api.ApplicationV2
  > = new Map()

  /* ---------------------------------------- */

  /**
   * Configuration object that defines types.
   */
  static get documentConfig() {
    // return CONFIG.GURPS[`${this.documentName.toLowerCase()}Types`]
  }

  get documentConfig() {
    return (this.constructor as typeof BaseAction).documentConfig
  }

  /* -------------------------------------------- */

  /**
   * The canonical name of this Action type, for example "Action".
   * @type {string}
   */
  static get documentName() {
    return this.metadata.name
  }

  get documentName() {
    return (this.constructor as typeof BaseAction).documentName
  }

  /* ---------------------------------------- */

  static metadata: ActionMetadata = {
    name: 'Action',
    type: 'base',
  }

  /* ---------------------------------------- */

  get metadata(): ActionMetadata {
    return (this.constructor as typeof BaseAction).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema() {
    return {
      ...baseActionSchema(),
      type: new fields.StringField({
        required: true,
        nullable: false,
        blank: false,
        readOnly: true,
        initial: () => this.metadata.type,
      }),
    }
  }

  /* -------------------------------------------- */
  /*  Instance Properties                         */
  /* -------------------------------------------- */

  /**
   * Unique identifier for this PseudoDocument within its item.
   */
  get id(): string {
    return this._id
  }

  /* -------------------------------------------- */

  /**
   * Unique ID for this PseudoDocument on an actor.
   */
  get relativeID(): string {
    return `${this.item.id}.${this.id}`
  }

  /* -------------------------------------------- */

  /**
   * Globally unique identifier for this PseudoDocument.
   */
  get uuid(): string {
    return `${this.item.uuid}.${this.documentName}.${this.id}`
  }

  /* -------------------------------------------- */

  /**
   * Item to which this PseudoDocument belongs.
   */
  get item(): Item.Implementation {
    if (!this.parent || !(this.parent.parent instanceof Item)) {
      throw new Error(`GURPS | BaseAction ${this.id} does not have a valid parent item.`)
    }
    return this.parent.parent as Item.Implementation
  }

  /* -------------------------------------------- */

  /**
   * Actor to which this PseudoDocument's item belongs, if the item is embedded.
   */
  get actor(): Actor.Implementation | null {
    return this.item.parent ?? null
  }

  /* -------------------------------------------- */

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  prepareSheetContext(): this {
    return this
  }

  /* ---------------------------------------- */

  prepareData(): void {}

  /* ---------------------------------------- */

  prepareBaseData(): void {}

  /* ---------------------------------------- */

  prepareDerivedData(): void {}

  /* -------------------------------------------- */
  /*  Socket Event Handlers                       */
  /* -------------------------------------------- */

  /**
   * Perform preliminary operations before an Activity is created.
   */
  protected async _preCreate(
    data: fields.SchemaField.CreateData<Schema>,
    user: User.Implementation
  ): Promise<boolean | void> {}
}

/* ---------------------------------------- */

const baseActionSchema = () => {
  return {
    _id: new fields.DocumentIdField({ initial: () => foundry.utils.randomID() }),
    type: new fields.StringField({
      required: true,
      nullable: false,
      blank: false,
      readOnly: true,
      // NOTE: This is overridden in the BaseAction class
      initial: () => 'base',
    }),
    name: new fields.StringField({ initial: undefined }),
    img: new fields.FilePathField({ initial: undefined, categories: ['IMAGE'], base64: false }),
    sort: new fields.IntegerSortField(),
  }
}

type BaseActionSchema = ReturnType<typeof baseActionSchema>

/* ---------------------------------------- */

export { BaseAction, type ActionMetadata, type BaseActionSchema }
