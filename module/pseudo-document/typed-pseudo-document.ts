import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel
import Document = foundry.abstract.Document

import { PseudoDocument, PseudoDocumentSchema } from './pseudo-document.js'

interface TypedPseudoDocumentCreateDialogOptions
  extends foundry.config.ApplicationConfiguration,
    foundry.applications.api.Dialog.WaitOptions {}

class TypedPseudoDocument<
  Schema extends TypedPseudoDocumentSchema = TypedPseudoDocumentSchema,
  Parent extends DataModel.Any = DataModel.Any,
> extends PseudoDocument<Schema, Parent> {
  static override defineSchema() {
    return Object.assign(super.defineSchema(), typedPseudoDocumentSchema(this))
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
    data = foundry.utils.deepClone(data)
    // @ts-expect-error: Types currently broken
    if (!data.type) data.type = Object.keys(this.TYPES)[0]
    // @ts-expect-error: Types currently broken
    if (!data.type || !(data.type in this.TYPES)) {
      throw new Error(
        // @ts-expect-error: Types currently broken
        `The '${data.type}' type is not a valid type for a '${this.metadata.documentName}' pseudo-document!`
      )
    }
    return super.create(data, { parent, ...operation })
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

    // TODO: implement
    const inputData = await GURPS.applications.api.DSDialog.input(foundry.utils.mergeObject(defaultOptions, options))

    if (!inputData) return

    foundry.utils.mergeObject(data, inputData)

    return this.create(data, createOptions)
  }
}

/* ---------------------------------------- */

const typedPseudoDocumentSchema = (self: DataModel.AnyConstructor) => {
  return {
    // @ts-expect-error: types are too strict to allow "this"
    type: new fields.DocumentTypeField(self, { required: true, nullable: false }),
  }
}

type TypedPseudoDocumentSchema = PseudoDocumentSchema & ReturnType<typeof typedPseudoDocumentSchema>

/* ---------------------------------------- */

export { TypedPseudoDocument, type TypedPseudoDocumentSchema }
