import { DataModel, Document, fields } from '@gurps-types/foundry/index.js'
import { systemPath } from '@module/util/misc.js'
import { AnyObject } from 'fvtt-types/utils'

import { PseudoDocument, pseudoDocumentSchema } from './pseudo-document.js'

/* ---------------------------------------- */

// @ts-expect-error - Polymorphic static create return type is incompatible with base class signature, this is a TS limitation
class TypedPseudoDocument<
  TName extends gurps.Pseudo.WithTypes = gurps.Pseudo.WithTypes,
  Schema extends TypedPseudoDocument.Schema = TypedPseudoDocument.Schema,
  Parent extends DataModel.Any = DataModel.Any,
> extends PseudoDocument<Schema, Parent> {
  declare readonly _documentName: TName

  static override defineSchema(): TypedPseudoDocument.Schema {
    return typedPseudoDocumentSchema(this)
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

    return Object.values(this.documentConfig).reduce(
      (acc, entry) => {
        const cls = (entry as { documentClass: typeof TypedPseudoDocument }).documentClass

        if (cls.TYPE) acc[cls.TYPE] = cls

        return acc
      },
      {} as Record<string, typeof TypedPseudoDocument>
    )
  }

  /* ---------------------------------------- */

  static get documentConfig(): PseudoDocumentConfig.Types[gurps.Pseudo.WithTypes & typeof this.metadata.documentName] {
    return GURPS.CONFIG.PseudoDocument[this.metadata.documentName] as any
  }

  /* ---------------------------------------- */

  isOfType<SubType extends TypedPseudoDocument.TypeNames<TName>>(
    ...types: SubType[]
  ): this is TypedPseudoDocument.OfType<TName, SubType>
  isOfType(...types: string[]): boolean {
    return types.includes(this.type)
  }

  /* ---------------------------------------- */

  static override async create<
    T extends typeof TypedPseudoDocument,
    Schema extends TypedPseudoDocument.Schema = TypedPseudoDocument.Schema,
  >(
    data: fields.SchemaField.CreateData<Schema> & AnyObject,
    options: Partial<gurps.Pseudo.CreateOperation>
  ): Promise<InstanceType<T> | undefined> {
    const createData = foundry.utils.deepClone(data) as fields.SchemaField.CreateData<Schema> & { type?: string }

    if (!createData.type) createData.type = Object.keys(this.TYPES)[0]

    if (!createData.type || !(createData.type in this.TYPES)) {
      throw new Error(
        `The '${createData.type}' type is not a valid type for a '${this.metadata.documentName}' pseudo-document!`
      )
    }

    return super.create(createData as AnyObject, options) as Promise<InstanceType<T> | undefined>
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

const typedPseudoDocumentSchema = (document: DataModel.AnyConstructor) => {
  return {
    ...pseudoDocumentSchema(),
    type: new fields.DocumentTypeField(document as unknown as Document.AnyConstructor, {
      required: true,
      nullable: false,
    }),
  }
}

namespace TypedPseudoDocument {
  export interface CreateDialogOptions
    extends foundry.config.ApplicationConfiguration, foundry.applications.api.Dialog.WaitOptions {}

  /* ---------------------------------------- */

  export type TypeNames<DocumentName extends gurps.Pseudo.WithTypes> = keyof PseudoDocumentConfig.Types[DocumentName]

  /* ---------------------------------------- */

  export type OfType<
    Name extends gurps.Pseudo.WithTypes,
    Type extends TypeNames<Name>,
  > = PseudoDocumentConfig.Types extends {
    readonly [_ in Name]: { readonly discriminate: 'all' }
  }
    ? PseudoDocumentConfig.Types[Name] extends { readonly [_1 in Type]: { documentClass: object | undefined } }
      ? PseudoDocumentConfig.Types[Name][Type]['documentClass']
      : never
    : never

  /* ---------------------------------------- */

  export type Schema = PseudoDocument.Schema & ReturnType<typeof typedPseudoDocumentSchema>
}

/* ---------------------------------------- */

export { TypedPseudoDocument }
