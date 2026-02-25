import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'
import { systemPath } from '@module/util/misc.js'
import { AnyObject } from 'fvtt-types/utils'

import { PseudoDocument } from './pseudo-document.js'

/* ---------------------------------------- */

class TypedPseudoDocument<
  Schema extends TypedPseudoDocument.Schema = TypedPseudoDocument.Schema,
  Parent extends DataModel.Any = DataModel.Any,
> extends PseudoDocument<Schema, Parent> {
  static override defineSchema() {
    return Object.assign(super.defineSchema(), typedPseudoDocumentSchema(this))
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<gurps.Pseudo.WithTypes> {
    return super.metadata as PseudoDocument.Metadata<gurps.Pseudo.WithTypes>
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

  static override CREATE_TEMPLATE = systemPath('templates/pseudo-document/typed-create-dialog.hbs')

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

  static get documentConfig() {
    return GURPS.CONFIG.PseudoDocument[this.metadata.documentName]
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
   * The localized label for this typed pseudodocument's type.
   */
  get typeLabel(): string {
    if (!globalThis.GURPS) return ''

    const config = GURPS.CONFIG.PseudoDocument[this.metadata.documentName as gurps.Pseudo.WithTypes]

    if (this.type in config) return config[this.type].label

    return ''
  }

  /* ---------------------------------------- */

  static override async create<Schema extends TypedPseudoDocument.Schema = TypedPseudoDocument.Schema>(
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

    return super.create(createData as DataModel.CreateData<TypedPseudoDocument.Schema>, { parent, ...operation })
  }

  /* ---------------------------------------- */

  protected static override _prepareCreateDialogContext(_parent: Document.Any): AnyObject {
    const typeOptions: { value: string; label: string }[] = Object.entries(this.documentConfig).map(
      ([value, { label }]: [string, { label: string }]) => ({
        value,
        label,
      })
    )

    return {
      typeOptions,
      fields: this.schema.fields,
    }
  }
}

/* ---------------------------------------- */

const typedPseudoDocumentSchema = (self: { TYPES: Record<string, unknown> }) => {
  return {
    type: new fields.DocumentTypeField(self as unknown as Document.AnyConstructor, { required: true, nullable: false }),
  }
}

namespace TypedPseudoDocument {
  export interface CreateDialogOptions
    extends foundry.config.ApplicationConfiguration, foundry.applications.api.Dialog.WaitOptions {}

  /* ---------------------------------------- */

  export type TypeNames<DocumentName extends gurps.Pseudo.WithTypes> = keyof PseudoDocumentConfig[DocumentName]

  /* ---------------------------------------- */

  export type OfType<Name extends gurps.Pseudo.WithTypes, Type extends TypeNames<Name>> = PseudoDocumentConfig extends {
    readonly [_ in Name]: { readonly discriminate: 'all' }
  }
    ? PseudoDocumentConfig[Name] extends { readonly [_1 in Type]: { documentClass: object | undefined } }
      ? PseudoDocumentConfig[Name][Type]
      : never
    : never

  /* ---------------------------------------- */

  export type Schema = PseudoDocument.Schema & ReturnType<typeof typedPseudoDocumentSchema>
}

/* ---------------------------------------- */

export { TypedPseudoDocument }
