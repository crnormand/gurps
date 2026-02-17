import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'

import { PseudoDocument, PseudoDocumentMetadata, PseudoDocumentSchema } from './pseudo-document.js'

namespace TypedPseudoDocument {
  export type TypeNames<DocumentName extends gurps.Pseudo.WithTypes> = keyof PseudoDocumentConfig[DocumentName]

  /* ---------------------------------------- */

  export type OfType<Name extends gurps.Pseudo.WithTypes, Type extends TypeNames<Name>> = PseudoDocumentConfig extends {
    readonly [_ in Name]: { readonly discriminate: 'all' }
  }
    ? PseudoDocumentConfig[Name] extends { readonly [_1 in Type]: { documentClass: object | undefined } }
      ? PseudoDocumentConfig[Name][Type]
      : never
    : never
}

interface TypedPseudoDocumentCreateDialogOptions
  extends foundry.config.ApplicationConfiguration, foundry.applications.api.Dialog.WaitOptions {}

/* ---------------------------------------- */

class TypedPseudoDocument<
  Schema extends TypedPseudoDocumentSchema = TypedPseudoDocumentSchema,
  Parent extends DataModel.Any = DataModel.Any,
> extends PseudoDocument<Schema, Parent> {
  static override defineSchema() {
    return Object.assign(super.defineSchema(), typedPseudoDocumentSchema(this))
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata<gurps.Pseudo.WithTypes> {
    return super.metadata as PseudoDocumentMetadata<gurps.Pseudo.WithTypes>
  }

  /* ---------------------------------------- */

  isOfType<DocumentName extends gurps.Pseudo.WithTypes, SubType extends TypedPseudoDocument.TypeNames<DocumentName>>(
    ...types: SubType[]
  ): this is TypedPseudoDocument.OfType<DocumentName, SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type)
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

    const types = GURPS.CONFIG.PseudoDocument[this.metadata.documentName]

    return Object.values(types).reduce(
      (acc: Record<string, typeof TypedPseudoDocument>, entry: { documentClass: typeof TypedPseudoDocument }) => {
        if (entry.documentClass.TYPE) acc[entry.documentClass.TYPE] = entry.documentClass

        return acc
      },
      {} as Record<string, unknown>
    )
  }

  /* ---------------------------------------- */

  /**
   * The localized label for this typed pseudodocument's type.
   */
  get typeLabel(): string {
    if (!globalThis.GURPS) return ''

    const config = GURPS.CONFIG.PseudoDocument[this.metadata.documentName as gurps.Pseudo.WithTypes]

    if (this.type in config) return config[this.type].label

    return ''
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
          choices: GURPS.CONFIG.PseudoDocument[this.metadata.documentName],
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

const typedPseudoDocumentSchema = (self: { TYPES: Record<string, unknown> }) => {
  return {
    type: new fields.DocumentTypeField(self as unknown as Document.AnyConstructor, { required: true, nullable: false }),
  }
}

type TypedPseudoDocumentSchema = PseudoDocumentSchema & ReturnType<typeof typedPseudoDocumentSchema>

/* ---------------------------------------- */

export { TypedPseudoDocument, type TypedPseudoDocumentSchema }
