import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'
import { hasMetadata, isUpdatableDocument } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { AnyObject } from 'fvtt-types/utils'

import { type ModelCollection } from '../data/model-collection.js'

import { PseudoDocumentSheet } from './pseudo-document-sheet.js'

class PseudoDocument<
  Schema extends PseudoDocument.Schema = PseudoDocument.Schema,
  Parent extends DataModel.Any = DataModel.Any,
> extends DataModel<Schema, Parent> {
  /* ---------------------------------------- */

  static get metadata(): PseudoDocument.Metadata<gurps.Pseudo.Name> {
    return {
      // @ts-expect-error: This is always overridden
      documentName: null,
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  get metadata() {
    return (this.constructor as typeof PseudoDocument).metadata
  }

  /* ---------------------------------------- */

  static override defineSchema(): PseudoDocument.Schema {
    return pseudoDocumentSchema()
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['GURPS.PSEUDO']

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
  get documentName(): string | null {
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
  get document(): Document.Any {
    const findDocument = (model: DataModel.Any): Document.Any => {
      if (model instanceof Document) return model

      return findDocument(model.parent)
    }

    return findDocument(this)
  }

  /* ---------------------------------------- */

  get fieldPath(): string {
    const fp = this.schema.fieldPath
    let path = fp.slice(0, fp.lastIndexOf('element') - 1)

    if (this.parent instanceof PseudoDocument) {
      path = [this.parent.fieldPath, this.parent.id, path].join('.')
    }

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
  /*   Data preparation                       */
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
   * @returns a promise that resolves to the updated document.
   */
  static async create(
    data: fields.SchemaField.CreateData<PseudoDocument.Schema>,
    { parent, ...operation }: Partial<foundry.abstract.types.DatabaseCreateOperation>
  ): Promise<Document.Any | undefined> {
    if (!parent) {
      throw new Error('A parent document must be specified for the creation of a pseudo-document!')
    }

    const id =
      operation.keepId && foundry.data.validators.isValidId((data._id as string | undefined) ?? '')
        ? data._id
        : foundry.utils.randomID()

    const fieldPath = (parent.system!.constructor as unknown as gurps.MetadataOwner).metadata.embedded?.[
      this.metadata.documentName
    ]

    if (!fieldPath) {
      const type = 'type' in parent ? parent.type : 'base'

      throw new Error(`A ${parent.documentName} of type '${type}' does not support ${this.metadata.documentName}!`)
    }

    const update = { [`${fieldPath}.${id}`]: { ...data, _id: id } }

    this._configureUpdates('create', parent, update, operation)

    // @ts-expect-error: TODO: define the Document types better so this doesn't resolve to "never"
    return parent.update(update, operation)
  }

  /* ---------------------------------------- */

  /**
   * Create a new instance of this pseudo-document with a prompt to choose the name.
   * @param data - The data used for the creation.
   * @param operation - The context of the operation.
   * @param operation.parent - The parent of this document.
   * @param options - Options for the creation dialog.
   * @returns A promise that resolves to the updated document.
   */
  static async createDialog<Schema extends PseudoDocument.Schema = PseudoDocument.Schema>(
    data: DataModel.CreateData<Schema>,
    { parent, ...operation }: Partial<foundry.abstract.types.DatabaseCreateOperation>
  ) {
    const content = await foundry.applications.handlebars.renderTemplate(
      this.CREATE_TEMPLATE,
      this._prepareCreateDialogContext(parent)
    )

    const result = await foundry.applications.api.DialogV2.input<foundry.applications.api.DialogV2.InputConfig>({
      content,
      window: {
        title: game.i18n?.format('DOCUMENT.New', {
          type: game.i18n.localize(`GURPS.PSEUDO.${this.metadata.documentName}`),
        }),
        icon: this.metadata.icon,
      },
      render: (event, dialog) => this._createDialogRenderCallback(event, dialog),
    })

    if (!result) return null

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

  /* ---------------------------------------- */

  /**
   * Duplicate this pseudo-document.
   * @returns {Promise<Document>}    A promise that resolves to the updated document.
   */
  async duplicate(): Promise<Document.Any | undefined> {
    if (!this.isSource) throw new Error('You cannot duplicate a non-source pseudo-document!')
    const activityData = foundry.utils.mergeObject(this.toObject(), {
      name: game.i18n?.format('DOCUMENT.CopyOf', { name: 'name' in this ? (this.name as string) : '' }),
    })

    return (this.constructor as typeof PseudoDocument).create(activityData, { parent: this.document })
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
   * @param {"create"|"update"|"delete"} _action     The operation.
   * @param {Document.Any} _document    The parent document.
   * @param {object} _update                         The data used for the update.
   * @param {object} _operation                      The context of the operation.
   */
  static _configureUpdates(
    _action: 'create' | 'update' | 'delete',
    _document: Document.Any,
    _update: object,
    _operation: object
  ) {}
}

/* ---------------------------------------- */

const pseudoDocumentSchema = () => {
  return {
    _id: new fields.DocumentIdField({ required: true, nullable: false, initial: () => foundry.utils.randomID() }),
  }
}

/* ---------------------------------------- */

namespace PseudoDocument {
  export type Metadata<Name extends gurps.Pseudo.Name> = {
    /* The document name of this pseudo-document. */
    documentName: Name
    /** The font-awesome icon for this pseudo-document type */
    icon: string
    /* Record of document names of pseudo-documents and the path to the collection. */
    embedded: Record<string, string>
    /* The class used to render this pseudo-document. */
    sheetClass?: typeof PseudoDocumentSheet
  }

  /* ---------------------------------------- */

  export type Schema = ReturnType<typeof pseudoDocumentSchema>
}

/* ---------------------------------------- */

export { PseudoDocument, pseudoDocumentSchema }
