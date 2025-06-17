import { BaseActionSheet } from './action-sheet.js'
import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields
import ApplicationV2 from 'node_modules/fvtt-types/src/foundry/client/applications/api/application.mjs'

type ActionMetadata<Type extends string = 'base'> = {
  type: Type
  label: string
  sheetClass?: typeof BaseActionSheet
}

/* ---------------------------------------- */

class BaseAction<Schema extends BaseActionSchema = BaseActionSchema> extends DataModel<Schema, DataModel.Any | null> {
  /* ---------------------------------------- */

  constructor(data: fields.SchemaField.CreateData<Schema>, context: DataModel.ConstructionContext) {
    super(data, context)
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

  /* ---------------------------------------- */

  /**
   * Mapping of Action UUID to the apps they should re-render.
   */
  static _apps: Map<string, Set<ApplicationV2>> = new Map()

  /* ---------------------------------------- */

  /**
   * Existing sheets of a specific type for a specific action.
   */
  static _sheets: Map<
    // [BaseAction, typeof foundry.applications.api.ApplicationV2],
    string,
    foundry.applications.api.ApplicationV2
  > = new Map()

  /* -------------------------------------------- */
  /*  Model Configuration                         */
  /* -------------------------------------------- */

  static metadata: ActionMetadata = {
    type: 'base',
    // TODO: check
    label: 'Base Action',
  }

  /* ---------------------------------------- */

  get metadata(): ActionMetadata {
    return (this.constructor as typeof BaseAction).metadata
  }

  /**
   * Configuration object that defines types.
   */
  static get documentConfig() {
    // TODO: implement
    return CONFIG.GURPS.actionTypes
  }

  get documentConfig() {
    return (this.constructor as typeof BaseAction).documentConfig
  }

  /* ---------------------------------------- */
  /*  Instance Properties                     */
  /* ---------------------------------------- */

  /**
   * Unique identifier for this Action within its item.
   */
  get id(): string {
    return this._id!
  }

  /* ---------------------------------------- */

  /**
   * Unique ID for this Action on an actor.
   */
  get relativeID(): string {
    return `${this.item.id}.${this.id}`
  }

  /* ---------------------------------------- */

  /**
   * Globally unique identifier for this Action.
   */
  get uuid(): string {
    return `${this.item.uuid}.Action.${this.id}`
  }

  /* ---------------------------------------- */

  /**
   * Item to which this Action belongs.
   */
  get item(): Item.Implementation {
    if (!this.parent || !(this.parent.parent instanceof Item)) {
      throw new Error(`GURPS | BaseAction ${this.id} does not have a valid parent item.`)
    }
    return this.parent.parent as Item.Implementation
  }

  /* -------------------------------------------- */

  /**
   * Actor to which this Action's item belongs, if the item is embedded.
   */
  get actor(): Actor.Implementation | null {
    return this.item.parent ?? null
  }

  /* -------------------------------------------- */

  /**
   * Lazily obtain a Application instance used to configure this Action, or null if no sheet is available.
   */
  get sheet(): BaseActionSheet | null {
    const cls = (this.constructor as typeof BaseAction).metadata.sheetClass
    if (!cls) return null

    if (!(this.constructor as typeof BaseAction)._sheets.has(this.uuid)) {
      const sheet = new cls({ document: this })
      ;(this.constructor as typeof BaseAction)._sheets.set(this.uuid, sheet)
    }
    return (this.constructor as typeof BaseAction)._sheets.get(this.uuid) as BaseActionSheet
  }

  /* -------------------------------------------- */
  /*  Display Methods                             */
  /* -------------------------------------------- */

  /**
   * Render all the Application instances which are connected to this Action.
   */
  render(options?: Partial<foundry.applications.api.ApplicationV2.RenderOptions>) {
    for (const app of (this.constructor as typeof BaseAction)._apps.get(this.uuid) ?? []) {
      app.render({ window: { title: app.title }, ...options })
    }
  }

  /* -------------------------------------------- */

  /**
   * Register an application to respond to updates to a certain document.
   */
  static _registerApp(doc: BaseAction, app: foundry.applications.api.ApplicationV2) {
    if (!this._apps.has(doc.uuid)) this._apps.set(doc.uuid, new Set())
    this._apps.get(doc.uuid)?.add(app)
  }

  /* -------------------------------------------- */

  /**
   * Remove an application from the render registry.
   */
  static _unregisterApp(doc: BaseAction, app: foundry.applications.api.ApplicationV2) {
    this._apps.get(doc?.uuid)?.delete(app)
  }

  /* ---------------------------------------- */
  /*  Editing Methods                         */
  /* ---------------------------------------- */

  /**
   * Update this Action.
   */
  async update(data: fields.SchemaField.UpdateData<Schema> | undefined, operation?: Item.Database.UpdateOperation) {
    const result = await this.item.updateAction(this.id, data, operation)
    this.render()
    return result
  }

  /* ---------------------------------------- */

  /**
   * Update this Action's data on the item without performing a database commit.
   */
  override updateSource(
    changes?: fields.SchemaField.UpdateData<Schema>,
    options?: DataModel.UpdateOptions
  ): fields.SchemaField.UpdateData<Schema> {
    super.updateSource(changes, options)
    return this
  }

  /* ---------------------------------------- */

  /**
   * Delete this PseudoDocument, removing it from the database.
   */
  async delete(operation: Item.Database.DeleteOperation): Promise<this> {
    return await this.item.deleteAction(this.id, operation)
  }

  /* --------------------------------------- */

  /**
   * Present a Dialog form to confirm deletion of this PseudoDocument.
   * @param {object} [options]           Positioning and sizing options for the resulting dialog.
   * @returns {Promise<PseudoDocument>}  A Promise which resolves to the deleted PseudoDocument.
   */
  async deleteDialog(options = {}) {
    const type = game.i18n?.localize(this.metadata.label) ?? ''

    return foundry.applications.api.Dialog.confirm({
      title: `${game.i18n?.format('DOCUMENT.Delete', { type })}: ${this.name || this.title}`,
      content: `<h4>${game.i18n.localize('AreYouSure')}</h4><p>${game.i18n?.format('SIDEBAR.DeleteWarning', {
        type,
      })}</p>`,
      yes: this.delete.bind(this),
      options: options,
    })
    // return Dialog.confirm({
    //   title: `${game.i18n.format('DOCUMENT.Delete', { type })}: ${this.name || this.title}`,
    //   content: `<h4>${game.i18n.localize('AreYouSure')}</h4><p>${game.i18n.format('SIDEBAR.DeleteWarning', {
    //     type,
    //   })}</p>`,
    //   yes: this.delete.bind(this),
    //   options: options,
    // })
  }

  /* ---------------------------------------- */

  /**
   * Serialize salient information for this PseudoDocument when dragging it.
   * @returns {object}  An object of drag data.
   */
  toDragData() {
    const dragData = { type: this.documentName, data: this.toObject() }
    if (this.id) dragData.uuid = this.uuid
    return dragData
  }

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
