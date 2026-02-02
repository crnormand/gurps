import { DataModel, Document, fields } from '../types/foundry/index.js'

import { pseudoDocumentSchema, PseudoDocument } from './pseudo-document.js'

interface TypedPseudoDocumentCreateDialogOptions
  extends foundry.config.ApplicationConfiguration, foundry.applications.api.Dialog.WaitOptions {}

class TypedPseudoDocument<
  Schema extends TypedPseudoDocumentSchema = TypedPseudoDocumentSchema,
  Parent extends DataModel.Any = DataModel.Any,
> extends PseudoDocument<Schema, Parent> {
  static override defineSchema(): TypedPseudoDocumentSchema {
    return typedPseudoDocumentSchema(this)
  }

  /* ---------------------------------------- */

  /**
   * The type of this pseudo-document subclass.
   * @abstract
   */
  static get TYPE(): string {
    return ''
  }

  /* ---------------------------------------- */

  /**
   * The subtypes of this pseudo-document.
   */
  static get TYPES(): Record<string, typeof TypedPseudoDocument> {
    if (!globalThis.GURPS) return {}

    return Object.values(
      GURPS.CONFIG[this.metadata.documentName] as Record<string, { documentClass: typeof TypedPseudoDocument }>
    ).reduce((acc: Record<string, typeof TypedPseudoDocument>, { documentClass }) => {
      if (documentClass.TYPE) acc[documentClass.TYPE] = documentClass

      return acc
    }, {})
  }

  /* ---------------------------------------- */

  /**
   * The localized label for this typed pseudodocument's type.
   */
  get typeLabel(): string {
    if (!globalThis.GURPS) return ''

    return (GURPS.CONFIG[this.metadata.documentName] as any)[this.type].label
  }

  /* ---------------------------------------- */

  static override async create<Schema extends TypedPseudoDocumentSchema = TypedPseudoDocumentSchema>(
    data: DataModel.CreateData<Schema>,
    { parent, ...operation }: Partial<foundry.abstract.types.DatabaseCreateOperation>
  ): Promise<Document.Any | undefined> {
    const createData = foundry.utils.deepClone(data) as DataModel.CreateData<Schema> & { type?: string }

    if (!createData.type) createData.type = Object.keys(this.TYPES)[0]

    if (!createData.type || !(createData.type in this.TYPES)) {
      throw new Error(
        `The '${createData.type}' type is not a valid type for a '${this.metadata.documentName}' pseudo-document!`
      )
    }

    return super.create(createData as DataModel.CreateData<TypedPseudoDocumentSchema>, { parent, ...operation })
  }

  /* ---------------------------------------- */

  /**
   * Create a new instance of this pseudo-document with a prompt to choose the type.
   * @param {object} [data]                                     The data used for the creation.
   * @param {object} createOptions                              The context of the operation.
   * @param {foundry.abstract.Document} createOptions.parent    The parent of this document.
   * @param {TypedPseudoDocumentCreateDialogOptions} [options={}]
   * @returns {Promise<foundry.abstract.Document>}              A promise that resolves to the updated document.
   */
  static async createDialog<Schema extends TypedPseudoDocumentSchema = TypedPseudoDocumentSchema>(
    data: DataModel.CreateData<Schema>,
    createOptions: { parent: Document.Any },
    options: TypedPseudoDocumentCreateDialogOptions
  ): Promise<Document.Any | undefined> {
    const defaultOptions: Partial<TypedPseudoDocumentCreateDialogOptions> = {
      window: {
        title: game.i18n?.format('DOCUMENT.Create', { type: game.i18n.localize(this.metadata.label) }),
        icon: this.metadata.icon,
      },
      content: this.schema.fields.type.toFormGroup(
        {
          label: 'DOCUMENT.FIELDS.type.label',
          localize: true,
        },
        {
          // TODO: implement
          choices: GURPS.CONFIG[this.metadata.documentName],
        }
      ).outerHTML,
    }

    // TODO: implement, fix type
    const inputData = await foundry.applications.api.DialogV2.input(
      foundry.utils.mergeObject(defaultOptions, options) as any
    )

    if (!inputData) return

    foundry.utils.mergeObject(data, inputData)

    return this.create(data, createOptions)
  }
}

/* ---------------------------------------- */

const typedPseudoDocumentSchema = (document: DataModel.AnyConstructor) => {
  return {
    ...pseudoDocumentSchema(),
    type: new fields.DocumentTypeField(document as unknown as Document.AnyConstructor, {
      required: true,
      nullable: false,
    }),
  }
}

type TypedPseudoDocumentSchema = ReturnType<typeof typedPseudoDocumentSchema>

/* ---------------------------------------- */

export { TypedPseudoDocument, type TypedPseudoDocumentSchema, typedPseudoDocumentSchema }
