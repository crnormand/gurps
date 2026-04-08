import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'
import { type BaseDisplayPseudoDocument } from '@gurps-types/gurps/display-item.js'
import { getGame, hasMetadata, isUpdatableDocument } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { AnyObject, Identity, InexactPartial } from 'fvtt-types/utils'

import { type ModelCollection } from '../data/model-collection.js'

import { PseudoDocumentSheet } from './pseudo-document-sheet.js'

class PseudoDocument<
  Schema extends PseudoDocument.Schema = PseudoDocument.Schema,
  Parent extends DataModel.Any = DataModel.Any,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraConstructorOptions extends AnyObject = {},
> extends DataModel<Schema, Parent> {
  constructor(...args: DataModel.ConstructorArgs<Schema, Parent, ExtraConstructorOptions>) {
    super(...args)
  }

  /* ---------------------------------------- */

  static get metadata(): PseudoDocument.Metadata<gurps.Pseudo.Name> {
    return {
      // @ts-expect-error: This should always be overridden
      documentName: null,
      label: '',
      icon: '',
      embedded: {},
      sortKeys: {},
    }
  }

  protected get static() {
    return this.constructor as typeof PseudoDocument
  }

  /* ---------------------------------------- */

  get metadata(): PseudoDocument.Metadata<gurps.Pseudo.Name> {
    return this.static.metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): PseudoDocument.Schema {
    return pseudoDocumentSchema()
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['DOCUMENT']

  /* -------------------------------------------------- */

  /**
   * Template for {@link createDialog}.
   */
  static CREATE_TEMPLATE = systemPath('templates/pseudo-document/base-create-dialog.hbs')

  /* ---------------------------------------- */

  /**
   * The id of this pseudo-document.
   */
  get id(): string {
    return this._id
  }

  /* ---------------------------------------- */

  /**
   * The document name of this pseudo document.
   */
  get documentName(): string {
    return this.metadata.documentName
  }

  /* ---------------------------------------- */

  /**
   * The uuid of this document.
   */
  get uuid(): string {
    let parent = this.parent

    while (!(parent instanceof PseudoDocument) && !(parent instanceof Document)) parent = parent.parent

    return [parent.uuid, this.documentName, this.id].join('.')
  }

  /* ---------------------------------------- */

  /**
   * The parent document of this pseudo-document.
   */
  get document(): gurps.Pseudo.ParentDocument {
    const findDocument = (model: DataModel.Any): gurps.Pseudo.ParentDocument => {
      if (model instanceof Document) return model as gurps.Pseudo.ParentDocument

      return findDocument(model.parent)
    }

    return findDocument(this)
  }

  /* ---------------------------------------- */

  get fieldPath(): string {
    let path = (this.parent.constructor as unknown as gurps.MetadataOwner).metadata.embedded[this.documentName]

    if (this.parent instanceof PseudoDocument) path = [this.parent.fieldPath, this.parent.id, path].join('.')

    return path
  }

  /* ---------------------------------------- */

  /**
   * Reference to the sheet of this pseudo-document, registered in a static map.
   * A pseudo-document is temporary, unlike regular documents, so the relation here
   * is not one-to-one.
   * @type {PseudoDocumentSheet | null}
   */
  get sheet() {
    return PseudoDocumentSheet.getSheet(this)
  }

  /* ---------------------------------------- */

  toDisplayItem(): BaseDisplayPseudoDocument {
    return {
      id: this.id,
      uuid: this.uuid,
      documentName: this.documentName,
    }
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  prepareBaseData() {}

  /* ---------------------------------------- */

  /**
   * Prepare derived data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  prepareDerivedData() {}

  /* ---------------------------------------- */
  /*   Instance Methods                       */
  /* ---------------------------------------- */

  /**
   * Retrieve an embedded pseudo-document.
   */
  getEmbeddedDocument(
    embeddedName: string,
    id: string,
    { invalid = false, strict = false }: { invalid?: boolean; strict?: boolean } = {}
  ): PseudoDocument | null {
    const embeds = this.metadata.embedded ?? {}

    if (embeddedName in embeds) {
      const path = embeds[embeddedName]

      return (
        (foundry.utils.getProperty(this, path) as ModelCollection<PseudoDocument>).get(id, { invalid, strict }) ?? null
      )
    }

    return null
  }

  /* ---------------------------------------- */

  /**
   * Obtain the embedded collection of a given pseudo-document type.
   */
  getEmbeddedPseudoDocumentCollection(embeddedName: string): ModelCollection {
    const collectionPath = this.metadata.embedded[embeddedName]

    if (!collectionPath) {
      throw new Error(
        `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
      )
    }

    return foundry.utils.getProperty(this, collectionPath) as ModelCollection
  }

  /* ---------------------------------------- */

  /**
   * Create drag data for storing on initiated drag events.
   */
  toDragData() {
    return {
      type: this.documentName,
      uuid: this.uuid,
    }
  }

  /* ---------------------------------------- */

  /**
   * Does this pseudo-document exist in the document's source?
   */
  get isSource() {
    const docName = this.documentName

    if (!hasMetadata(this.parent.constructor)) return false

    const fieldPath = docName ? this.parent.constructor.metadata.embedded[docName] : undefined

    if (!fieldPath) return false

    const parent = this.parent instanceof foundry.abstract.TypeDataModel ? this.parent.parent : this.parent
    const source = foundry.utils.getProperty(parent._source, fieldPath) as AnyObject

    if (foundry.utils.getType(source) !== 'Object') {
      throw new Error('Source is not an object!')
    }

    return this.id in source
  }

  /* ---------------------------------------- */

  /**
   * Create a new instance of this pseudo-document.
   * @returns a promise that resolves to the created pseudo-document instance, or `undefined` if it cannot be retrieved.
   */
  static async create<T extends typeof PseudoDocument>(
    data: fields.SchemaField.CreateData<PseudoDocument.Schema>,
    { parent, renderSheet = true, ...operation }: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<InstanceType<T> | undefined> {
    if (!parent) {
      throw new Error('A parent document must be specified for the creation of a pseudo-document!')
    }

    const id: string =
      operation.keepId && foundry.data.validators.isValidId((data._id as string | undefined) ?? '')
        ? (data._id as string)
        : foundry.utils.randomID()

    const fieldPath = (parent.system?.constructor as unknown as gurps.MetadataOwner).metadata.embedded?.[
      this.metadata.documentName
    ]

    if (!fieldPath) {
      const type = 'type' in parent ? parent.type : 'base'

      throw new Error(`A ${parent.documentName} of type '${type}' does not support ${this.metadata.documentName}!`)
    }

    const update = { [`${fieldPath}.${id}`]: { ...data, _id: id } }

    this._configureUpdates('create', parent, update, operation)

    await parent.update(update, operation)

    // HACK: There is really no cleaner way to define this.
    const pseudo = (
      parent as {
        getEmbeddedDocument(name: string, id: string, options: object): InstanceType<T> | undefined
      }
    ).getEmbeddedDocument(this.metadata.documentName, id, {})

    if (renderSheet && pseudo) pseudo.sheet?.render({ force: true })

    return pseudo
  }

  /* ---------------------------------------- */

  /**
   * Create a new instance of this pseudo-document with a prompt to choose the name.
   * @param data - The data used for the creation.
   * @param operation - The context of the operation.
   * @param operation.parent - The parent of this document.
   * @returns A promise that resolves to the updated document.
   */
  static async createDialog<T extends typeof PseudoDocument>(
    data: DataModel.CreateData<PseudoDocument.Schema>,
    { parent, ...operation }: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<InstanceType<T> | undefined> {
    const content = await foundry.applications.handlebars.renderTemplate(
      this.CREATE_TEMPLATE,
      this._prepareCreateDialogContext(parent)
    )

    const result = await foundry.applications.api.DialogV2.input<foundry.applications.api.DialogV2.InputConfig>({
      content,
      window: {
        title: game.i18n?.format('DOCUMENT.New', {
          type: game.i18n.localize(`DOCUMENT.${this.metadata.documentName}`),
        }),
        icon: this.metadata.icon,
      },
      render: (event, dialog) => this._createDialogRenderCallback(event, dialog),
    })

    if (!result) return

    return this.create({ ...data, ...result }, { parent, ...operation })
  }

  /* ---------------------------------------- */

  /**
   * Prepares context for use with {@link CREATE_TEMPLATE}.
   * @param parent - The parent DataModel of the pseudo-document being created.
   * @returns The prepared create dialog context.
   */
  protected static _prepareCreateDialogContext(_parent?: Document.Any | null): AnyObject {
    return {
      fields: this.schema.fields,
    }
  }

  /* ---------------------------------------- */

  /**
   * Render callback for dynamic handling of the create dialog. This can be used to, for example, dynamically populate
   * the choices for a select field based on the parent document.
   */
  protected static _createDialogRenderCallback(_event: Event, _dialog: foundry.applications.api.DialogV2): void {}

  /* ---------------------------------------- */

  /**
   * Delete this pseudo-document.
   * @returns a promise that resolves to the updated document.
   */
  async delete(
    operation?: Document.Database.DeleteOperation<foundry.abstract.types.DatabaseDeleteOperation<Document.Any>>
  ): Promise<Document.Any | undefined> {
    operation ??= {}

    if (!this.isSource) throw new Error('You cannot delete a non-source pseudo-document!')
    if (!isUpdatableDocument(this.document)) throw new Error('Document does not support updates!')

    Object.assign(operation, { pseudo: { operation: 'delete', type: this.documentName, uuid: this.uuid } })
    const update = { [`${this.fieldPath}.-=${this.id}`]: null }

    if (hasMetadata(this.constructor)) {
      PseudoDocument._configureUpdates('delete', this.document, update, operation)
    }

    return this.document.update(update, operation)
  }

  /**
   * Present a Dialog form to confirm deletion of this PseudoDocument.
   * @param [options] Additional options passed to `DialogV2.confirm`
   * @param [operation]  Document deletion options.
   * @returns A Promise that resolves to the deleted PseudoDocument
   */
  async deleteDialog(
    options?: InexactPartial<foundry.applications.api.DialogV2.ConfirmConfig>,
    operation?: PseudoDocument.DeleteOperation
  ): Promise<this | false | null | undefined> {
    let content = options?.content

    const type = getGame().i18n.localize(this.metadata.label)
    const name = ('name' in this ? this.name : null) as string | null

    if (!content) {
      const question = getGame().i18n.localize('AreYouSure')
      const warning = getGame().i18n.format('SIDEBAR.DeleteWarning', { type })

      content = `<p><strong>${question}</strong> ${warning}</p>`
    }

    return foundry.applications.api.DialogV2.confirm(
      foundry.utils.mergeObject(
        {
          content,
          yes: { callback: () => this.delete(operation) },
          window: {
            icon: 'fa-solid fa-trash',
            title: `${getGame().i18n.format('DOCUMENT.Delete', { type })}: ${name}`,
          },
        },
        options
      ) as foundry.applications.api.DialogV2.ConfirmConfig
    ) as Promise<this | false | null | undefined>
  }

  /* ---------------------------------------- */

  /**
   * Duplicate this pseudo-document.
   * @returns - A duplicate of this pseudo-document. The duplicate will not be saved to the document until the parent
   * document is updated.
   */
  async duplicate(): Promise<this> {
    if (!this.isSource) throw new Error('You cannot duplicate a non-source pseudo-document!')
    const activityData = foundry.utils.mergeObject(this.toObject(), {
      name: game.i18n?.format('DOCUMENT.CopyOf', { name: 'name' in this ? (this.name as string) : '' }),
    })

    const result = await this.static.create(activityData, { parent: this.document })

    if (!result) throw new Error('Failed to duplicate pseudo-document!')

    return result as this
  }

  /* ---------------------------------------- */

  /**
   * Update this pseudo-document.
   * @param {object} [change]                         The change to perform.
   * @param {object} [operation]                      The context of the operation.
   * @returns {Promise<Document>}    A promise that resolves to the updated document.
   */
  async update(
    change: AnyObject = {},
    operation: Document.Database.UpdateOperation<foundry.abstract.types.DatabaseUpdateOperation> = {}
  ): Promise<gurps.UpdatableDocument> {
    if (!this.isSource) throw new Error('You cannot update a non-source pseudo-document!')
    if (!isUpdatableDocument(this.document)) throw new Error('Document does not support updates!')

    const path = [this.fieldPath, this.id].join('.')
    const update = { [path]: change }

    if (hasMetadata(this.constructor)) {
      PseudoDocument._configureUpdates('update', this.document, update, operation)
    }

    return this.document.update(update, operation)
  }

  /* ---------------------------------------- */

  /**
   * Allow for subclasses to configure the CRUD workflow.
   * @param action - The operation.
   * @param document - The parent document.
   * @param update - The data used for the update.
   * @param operation - The context of the operation.
   */
  static _configureUpdates(
    _action: 'create' | 'update' | 'delete',
    _document: Document.Any,
    _update: AnyObject,
    _operation: Document.Database.UpdateOperation<foundry.abstract.types.DatabaseUpdateOperation>
  ) {}
}

/* ---------------------------------------- */

const pseudoDocumentSchema = () => {
  return {
    _id: new fields.DocumentIdField({ required: true, nullable: false, initial: () => foundry.utils.randomID() }),
    name: new fields.StringField({
      required: true,
      nullable: false,
      initial: () => '',
    }) as fields.StringField<{ required: true; nullable: false; initial: () => string }>,
    img: new fields.FilePathField({ categories: ['IMAGE'] }),
    sort: new fields.IntegerSortField({ required: true, initial: 0 }),
    flags: new fields.ObjectField({ required: false, nullable: false, initial: () => ({}) }),
  }
}

/* ---------------------------------------- */

namespace PseudoDocument {
  export type Metadata<Name extends gurps.Pseudo.Name> = {
    /** The document name of this pseudo-document. */
    documentName: Name
    /** The localizable label for this pseudo-document type. */
    label: string
    /** The font-awesome icon for this pseudo-document type */
    icon: string
    /* Record of document names of pseudo-documents and the path to the collection. */
    embedded: Record<string, string>
    /* The class used to render this pseudo-document. */
    sheetClass?: typeof PseudoDocumentSheet
    /**
     * The sort keys for this pseudo-document type, used to determine
     * which property to look up when sorting items of this type.
     * The key is the name of the entity property to sort by, and the
     * value is the path to the property value.
     */
    sortKeys: Record<string, string>
  }

  /* ---------------------------------------- */

  export type Schema = ReturnType<typeof pseudoDocumentSchema>

  /* ---------------------------------------- */

  export type DeleteOperation = Document.Database.DeleteOperation<
    foundry.abstract.types.DatabaseDeleteOperation<Document.Any>
  >

  /* ---------------------------------------- */

  type DataSchema = ReturnType<typeof pseudoDocumentSchema> & fields.DataSchema

  declare abstract class AnyPseudoDocument extends PseudoDocument<DataSchema, any, AnyObject> {
    constructor(...args: never)
  }

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  declare class ConcretePseudoDocument extends PseudoDocument<DataSchema, DataModel.Any, {}> {}

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Any extends AnyPseudoDocument {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AnyConstructor extends Identity<typeof AnyPseudoDocument> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface ConcreteConstructor extends Identity<typeof ConcretePseudoDocument> {}
}

/* ---------------------------------------- */

export { PseudoDocument, pseudoDocumentSchema }
