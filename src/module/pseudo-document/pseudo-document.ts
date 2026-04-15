import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'
import { type BaseDisplayPseudoDocument } from '@gurps-types/gurps/display-item.js'
import { isContainable } from '@module/data/mixins/containable.js'
import { deleteDialogWithContents } from '@module/util/delete-dialog.js'
import { getGame, hasMetadata, isUpdatableDocument } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { AnyObject, Identity, InexactPartial } from 'fvtt-types/utils'

import { type ModelCollection } from '../data/model-collection.js'

import { PseudoDocumentSheet } from './pseudo-document-sheet.js'

class PseudoDocument<
  Schema extends PseudoDocument.Schema = PseudoDocument.Schema,
  Parent extends DataModel.Any = DataModel.Any,
  ExtraConstructorOptions extends PseudoDocument.ConstructorOptions = PseudoDocument.ConstructorOptions,
> extends DataModel<Schema, Parent> {
  // @ts-expect-error: `this` *should* be allowed here. TODO: look into.
  declare collection: ModelCollection<this>

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

  /* ---------------------------------------- */

  static getDefaultArtwork(_data: AnyObject): Record<string, string> {
    return { img: 'icons/svg/item-bag.svg' }
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = [...super.LOCALIZATION_PREFIXES, 'GURPS.pseudo']

  /* ---------------------------------------- */

  protected override _initialize(options?: DataModel.InitializeOptions | undefined): void {
    super._initialize(options)

    const cls = this.constructor as typeof PseudoDocument

    foundry.helpers.Localization.localizeDataModel(cls, { prefixes: cls.LOCALIZATION_PREFIXES })
  }

  /* -------------------------------------------------- */

  /**
   * Template for {@link createDialog}.
   */
  static CREATE_TEMPLATE = systemPath('templates/pseudo-document/base-create-dialog.hbs')

  /* ---------------------------------------- */

  protected get static() {
    return this.constructor as typeof PseudoDocument
  }

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

  get metadata(): PseudoDocument.Metadata<gurps.Pseudo.Name> {
    return this.static.metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): PseudoDocument.Schema {
    return pseudoDocumentSchema()
  }

  /* ---------------------------------------- */

  /**
   * Gets the default new name for a PsuedoDocument
   * @param {object} context                    The context for which to create the Document name.
   * @param {string} [context.type]             The sub-type of the document
   * @param {Document|null} [context.parent]    A parent document within which the created Document should belong
   * @param {string|null} [context.pack]        A compendium pack within which the Document should be created
   * @returns {string}
   */
  static defaultName({
    type,
    parent,
    pack,
  }: {
    type?: string
    parent?: gurps.Pseudo.ParentDocument | null
    pack?: string | null
  } = {}): string {
    const documentName = this.metadata.documentName

    let collection: foundry.utils.Collection.Any | undefined

    // @ts-expect-error: Document.prototype.getEmbeddedCollection documentName is typed as `never`, but subclasses override it.
    if (parent) collection = parent.getEmbeddedCollection(documentName)
    else if (pack) collection = getGame().packs.get(pack)?.index
    else collection = getGame().collections.get(documentName)
    const takenNames = new Set()

    if (!collection) {
      console.warn(
        `GURPS | PseudoDocument.defaultName was unable to find a collection for document name '${documentName}'!`
      )

      return 'Document'
    }

    for (const document of collection) takenNames.add((document as PseudoDocument.Any).name)
    let baseNameKey = this.metadata.label

    if (type && 'documentConfig' in this && typeof this.documentConfig === 'object' && this.documentConfig !== null) {
      const types = this.documentConfig as Record<string, gurps.Pseudo.ConfigEntry<any>>

      if (type in types) {
        const typeNameKey = types[type]?.label

        if (typeNameKey && getGame().i18n.has(typeNameKey)) baseNameKey = typeNameKey
      } else {
        console.warn(
          `GURPS | The type '${type}' is not valid for a '${this.metadata.documentName}' pseudo-document! Valid types are: ${Object.keys(types).join(', ')}`
        )
      }
    }

    const baseName = getGame().i18n.localize(baseNameKey)
    let name = baseName
    let index = 1

    while (takenNames.has(name)) name = `${baseName} (${++index})`

    return name
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
   */
  get sheet(): PseudoDocumentSheet | null {
    return PseudoDocumentSheet.getSheet(this as PseudoDocument.Any)
  }

  /* ---------------------------------------- */

  protected override _configure(options: DataModel.ConfigureOptions & ExtraConstructorOptions) {
    super._configure(options)
    Object.defineProperty(this, 'collection', {
      value: options.collection ?? null,
      writable: false,
    })
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

  getRelativeUUID(relative: PseudoDocument.Any | gurps.Pseudo.ParentDocument): string {
    // This PseudoDocument is a sibling of the relative Document.
    if (this.collection === relative.collection) return `.${this.id}`

    // This PseudoDocument may be a descendant of the relative Document, so walk up the hierarchy to check.
    const parts = [this.documentName, this.id]
    let parent: DataModel.Any = this.parent

    while (parent) {
      if (parent === relative) break

      // Skip intermediate non-Document/PseudoDocument data models
      if ('documentName' in parent)
        parts.unshift((parent as PseudoDocument).documentName, (parent as PseudoDocument).id)

      parent = parent.parent
    }

    // The relative Document was a parent or grandparent of this one.
    if (parent === relative) return `.${parts.join('.')}`

    // The relative Document was unrelated to this one.
    return this.uuid
  }

  /* ---------------------------------------- */

  /**
   * Retrieve an embedded pseudo-document.
   */
  getEmbeddedDocument(
    embeddedName: string,
    id: string,
    { invalid = false, strict = false }: { invalid?: boolean; strict?: boolean } = {}
  ): PseudoDocument | null {
    return this.getEmbeddedCollection(embeddedName).get(id, { invalid, strict }) ?? null
  }

  /* ---------------------------------------- */

  /**
   * Obtain the embedded collection of a given pseudo-document type.
   */
  getEmbeddedCollection(embeddedName: string): ModelCollection<PseudoDocument> {
    const collectionPath = this.metadata.embedded[embeddedName]

    if (!collectionPath) {
      throw new Error(
        `${embeddedName} is not a valid embedded Pseudo-Document within the [${'type' in this ? this.type : 'base'}] ${this.documentName} subtype!`
      )
    }

    return foundry.utils.getProperty(this, collectionPath) as ModelCollection<PseudoDocument>
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
   * A helper function to handle obtaining the relevant PseudoDocument from dropped data provided via a DataTransfer event.
   * The dropped data must have a UUID.
   *
   * @param   data The data object extracted from a DataTransfer event.
   * @returns      The resolved PseudoDocument.
   * @throws If a Document could not be retrieved from the provided data.
   */
  static async fromDropData(data: { uuid: string; type: string }): Promise<PseudoDocument> {
    const pseudo = (await foundry.utils.fromUuid(data.uuid as string)) as PseudoDocument | null

    // Ensure that we retrieved a valid document
    if (!pseudo) {
      throw new Error('Failed to resolve PseudoDocument from provided DragData. A valid UUID must be provided.')
    }

    if (pseudo.documentName !== this.metadata.documentName) {
      throw new Error(`Invalid Document type '${pseudo.documentName}' provided to ${this.name}.fromDropData.`)
    }

    return pseudo
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
  /*  CRUD Handlers                           */
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
  static async create(
    data: fields.SchemaField.CreateData<PseudoDocument.Schema> | fields.SchemaField.CreateData<PseudoDocument.Schema>[],
    { parent, renderSheet = true, ...operation }: Partial<gurps.Pseudo.CreateOperation>
  ) {
    const isArray = Array.isArray(data)
    const createData = isArray ? data : [data]

    const created = await this.createDocuments(createData, { parent, ...operation })

    if (renderSheet && created) {
      created.forEach(pseudo => pseudo.sheet?.render({ force: true }))
    }

    return isArray ? created : created.shift()
  }

  /* ---------------------------------------- */

  static async createDocuments<T extends typeof PseudoDocument>(
    data: fields.SchemaField.CreateData<PseudoDocument.Schema> | fields.SchemaField.CreateData<PseudoDocument.Schema>[],
    { parent, pack, ...operation }: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<InstanceType<T>[]> {
    if (!parent) {
      console.error('A parent document must be specified for the creation of pseudo-documents!')

      return []
    }

    data = Array.isArray(data) ? data : [data]

    const updates: Record<string, any> = {}

    const fieldPath = (parent.system?.constructor as unknown as gurps.MetadataOwner).metadata.embedded?.[
      this.metadata.documentName
    ]

    if (!fieldPath) {
      const type = 'type' in parent ? parent.type : 'base'

      console.error(`A ${parent.documentName} of type '${type}' does not support ${this.metadata.documentName}!`)

      return []
    }

    for (const dataEntry of data) {
      const _id: string =
        operation.keepId && foundry.data.validators.isValidId((dataEntry._id as string | undefined) ?? '')
          ? (dataEntry._id as string)
          : foundry.utils.randomID()

      dataEntry._id = _id

      if (!('name' in dataEntry) || typeof dataEntry.name !== 'string' || dataEntry.name.trim() === '') {
        const type = 'type' in dataEntry ? String(dataEntry.type) : undefined

        const defaultName = this.defaultName({ type, parent, pack })

        dataEntry.name = defaultName
      }

      updates[`${fieldPath}.${_id}`] = { ...dataEntry, _id }
    }

    this._configureUpdates('create', parent, updates, operation)

    await parent.update(updates, operation)

    const created: InstanceType<T>[] = []

    for (const dataEntry of data) {
      const maybeCreated = (parent as any).getEmbeddedDocument(this.metadata.documentName, dataEntry._id as string, {})

      if (maybeCreated) created.push(maybeCreated as InstanceType<T>)
    }

    return created
  }

  /* ---------------------------------------- */

  /**
   * Delete this pseudo-document.
   * @returns a promise that resolves to the updated document.
   */
  async delete(operation?: PseudoDocument.DeleteOperation): Promise<this | undefined> {
    operation ??= {}

    if (!this.isSource) throw new Error('You cannot delete a non-source pseudo-document!')
    if (!isUpdatableDocument(this.document)) throw new Error('Document does not support updates!')

    Object.assign(operation, { pseudo: { operation: 'delete', type: this.documentName, uuid: this.uuid } })

    const deleted = await (this.constructor as typeof PseudoDocument).deleteDocuments(this.id, {
      parent: this.document as gurps.Pseudo.ParentDocument,
      ...operation,
    })

    return (deleted?.shift() as this) ?? undefined
  }

  /* ---------------------------------------- */

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
    return (await deleteDialogWithContents.call(
      this as PseudoDocument.Any,
      options,
      operation as any
    )) as unknown as Promise<this | false | null | undefined>
  }

  /* ---------------------------------------- */

  static async deleteDocuments<T extends typeof PseudoDocument>(
    ids: string | Array<string>,
    { parent, ...operation }: Partial<PseudoDocument.DeleteOperation>
  ): Promise<InstanceType<T>[]> {
    if (!parent) {
      console.error('A parent document must be specified for the deletion of pseudo-documents!')

      return []
    }

    ids = Array.isArray(ids) ? ids : [ids]

    const fieldPath = (parent.system?.constructor as unknown as gurps.MetadataOwner).metadata.embedded?.[
      this.metadata.documentName
    ]

    if (!fieldPath) {
      const type = 'type' in parent ? parent.type : 'base'

      console.error(`A ${parent.documentName} of type '${type}' does not support ${this.metadata.documentName}!`)

      return []
    }

    const updates: Record<string, any> = {}
    const deleted: InstanceType<T>[] = []

    for (const id of ids) {
      const maybeDeleted = (parent as any).getEmbeddedDocument(this.metadata.documentName, id, {})

      if (maybeDeleted) {
        updates[`${fieldPath}.-=${id}`] = null
        deleted.push(maybeDeleted as InstanceType<T>)

        if (hasMetadata(this.constructor)) {
          PseudoDocument._configureUpdates('delete', maybeDeleted, updates, operation)
        }

        if (isContainable(maybeDeleted) && maybeDeleted.contents.length > 0) {
          if (operation && operation.deleteContents) {
            const allContents = maybeDeleted.allContents as PseudoDocument[]

            allContents.forEach((doc: PseudoDocument) => {
              updates[`${doc.fieldPath}.-=${doc.id}`] = null
            })
          } else {
            const containedBy = maybeDeleted.containedBy ?? null
            const contents = maybeDeleted.contents as PseudoDocument[]

            contents.forEach((doc: PseudoDocument) => {
              updates[`${doc.fieldPath}.${doc.id}.containedBy`] = containedBy
            })
          }
        }
      }
    }

    await (parent as any).update(updates, operation)

    return deleted
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
    { parent, pack, ...operation }: Partial<gurps.Pseudo.CreateOperation>,
    options: PseudoDocument.CreateDialogOptions = {}
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
      render: (event, dialog) => this._createDialogRenderCallback(event, dialog, { parent, pack, ...options }),
    })

    if (!result) return

    return this.create({ ...data, ...result }, { parent, ...operation }) as InstanceType<T> | undefined
  }

  /* ---------------------------------------- */

  /**
   * Prepares context for use with {@link CREATE_TEMPLATE}.
   * @param parent - The parent DataModel of the pseudo-document being created.
   * @returns The prepared create dialog context.
   */
  protected static _prepareCreateDialogContext(_parent?: Document.Any | null): AnyObject {
    const schema = this.schema

    foundry.helpers.Localization.localizeSchema(schema, this.LOCALIZATION_PREFIXES)

    return {
      fields: schema.fields,
    }
  }

  /* ---------------------------------------- */

  /**
   * Render callback for dynamic handling of the create dialog. This can be used to, for example, dynamically populate
   * the choices for a select field based on the parent document.
   */
  protected static _createDialogRenderCallback(
    _event: Event,
    dialog: foundry.applications.api.DialogV2,
    options: PseudoDocument.CreateDialogOptions = {}
  ): void {
    const hasTypes = 'documentConfig' in this && typeof this.documentConfig === 'object' && this.documentConfig !== null

    if (!hasTypes) return

    const { parent, pack } = options

    dialog.element.querySelector<HTMLInputElement>('[name="type"]')?.addEventListener('change', ev => {
      const target = ev.target as HTMLInputElement
      const nameInput = dialog.element.querySelector<HTMLInputElement>('[name="name"]')

      if (!nameInput) return

      nameInput.placeholder = this.defaultName({ type: target.value, parent, pack })
    })

    const typeInput = dialog.element.querySelector<HTMLInputElement>('[name="type"]')
    const nameInput = dialog.element.querySelector<HTMLInputElement>('[name="name"]')

    if (nameInput && typeInput) {
      nameInput.placeholder = this.defaultName({ type: typeInput.value, parent, pack })
    }
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
    operation: PseudoDocument.UpdateOperation = {}
  ): Promise<gurps.UpdatableDocument> {
    if (!this.isSource) throw new Error('You cannot update a non-source pseudo-document!')
    if (!isUpdatableDocument(this.document)) throw new Error('Document does not support updates!')

    // Do not update the _id of the pseudo-document, as it is used to track the document in the parent source data.
    if ('_id' in change) {
      console.warn('The _id of a pseudo-document cannot be updated! Ignoring _id change.', {
        attemptedId: change._id,
        documentId: this.id,
      })

      const { _id, ...rest } = change

      change = rest
    }

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
    _document: gurps.Pseudo.ParentDocument,
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
    sheetClass?: any
    /**
     * The sort keys for this pseudo-document type, used to determine
     * which property to look up when sorting items of this type.
     * The key is the name of the entity property to sort by, and the
     * value is the path to the property value.
     */
    sortKeys: Record<string, string>
    /** Are there any partials to fill in the Details tab of the PseudoDocument? */
    detailsPartial: string[]
  }

  /* ---------------------------------------- */

  export type Schema = ReturnType<typeof pseudoDocumentSchema>

  /* ---------------------------------------- */

  export type ConstructorOptions = AnyObject & {
    collection?: ModelCollection<PseudoDocument>
  }

  /* ---------------------------------------- */

  export interface DeleteOperation extends Document.Database.DeleteOperation<
    foundry.abstract.types.DatabaseDeleteOperation<gurps.Pseudo.ParentDocument>
  > {
    deleteContents?: boolean
  }

  /* ---------------------------------------- */

  export type CreateDialogOptions = InexactPartial<{
    /** Override the type choices for this PseudoDocument create dialog */
    types: string[]

    /** A compendium pack within which the PseudoDocument should be created */
    pack: string | null

    /** A parent document within which the created PsuedoDocument should belong */
    parent: gurps.Pseudo.ParentDocument | null
  }>

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

  /* ---------------------------------------- */

  export type UpdateOperation = Document.Database.UpdateOperation<foundry.abstract.types.DatabaseUpdateOperation>
}

/* ---------------------------------------- */

export { PseudoDocument, pseudoDocumentSchema }
