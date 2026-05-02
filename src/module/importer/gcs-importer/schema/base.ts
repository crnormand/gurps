import { DataModel, fields } from '@gurps-types/foundry/index.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

const sourcedIdSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    source: new fields.StringField({ required: true, nullable: true }),
  }
}

type SourcedIdSchema = ReturnType<typeof sourcedIdSchema>

/* ---------------------------------------- */

interface GcsElementClass {
  importSchema(data: any, schema?: any, verbose?: boolean): any
}

class GcsLazyEmbeddedField extends fields.ObjectField<fields.ObjectField.DefaultOptions> {
  readonly #classGetter: () => GcsElementClass

  constructor(classGetter: () => GcsElementClass, options?: fields.DataField.Options<AnyMutableObject>) {
    super(options as fields.ObjectField.DefaultOptions)
    this.#classGetter = classGetter
  }

  get modelClass(): GcsElementClass {
    return this.#classGetter()
  }
}

/* ---------------------------------------- */

class GcsElement<
  Schema extends fields.DataSchema = fields.DataSchema,
  Parent extends DataModel.Any | null = DataModel.Any | null,
> extends DataModel<Schema, Parent> {
  container: null | GcsElement<any> = null

  static fromImportData<Schema extends fields.DataSchema>(
    importData: AnyObject,
    parent: null | GcsElement = null,
    verbose = false
  ) {
    const createData: DataModel.CreateData<Schema> = this.importSchema(
      importData as Partial<Schema> & AnyObject,
      this.defineSchema() as Schema,
      verbose
    )

    return new this(createData as DataModel.CreateData<Schema>, { parent })
  }

  /* ---------------------------------------- */

  static importSchema<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema = this.defineSchema() as Schema,
    verbose = false
  ): DataModel.CreateData<Schema> {
    const data: AnyMutableObject = {}
    const replacements: Record<string, string> = (importData?.replacements as unknown as Record<string, string>) ?? {}

    if (verbose) {
      const schemaKeys = new Set(Object.keys(schema))
      const unknownKeys = Object.keys(importData).filter(key => !schemaKeys.has(key) && key !== 'replacements')

      if (unknownKeys.length) console.debug(`[GCS Import: ${this.name}] Unknown data keys:`, unknownKeys)
    }

    for (const [key, field] of Object.entries(schema)) {
      data[key] = this._importField(importData[key], field, key, replacements, verbose)
    }

    return data as DataModel.CreateData<Schema>
  }

  /* ---------------------------------------- */

  protected static _importField(
    data: any,
    field: fields.DataField.Any,
    _name: string,
    _replacements: Record<string, string> = {},
    verbose = false
  ): any {
    if (verbose) {
      if (data === undefined)
        console.debug(`[GCS Import: ${this.name}] Field '${_name}' (${field.constructor.name}): missing from data`)
      else console.debug(`[GCS Import: ${this.name}] Field '${_name}' (${field.constructor.name}):`, data)
    }

    if (
      field instanceof fields.StringField ||
      field instanceof fields.NumberField ||
      field instanceof fields.BooleanField ||
      field instanceof fields.ObjectField
    ) {
      return data ?? field.getInitialValue()
    }

    if (field instanceof fields.ArrayField) {
      const element = (field as fields.ArrayField<fields.DataField.Any>).element

      if (element instanceof fields.EmbeddedDataField) {
        const ModelClass = element.model as typeof GcsElement

        if (verbose)
          console.debug(
            `[GCS Import: ${this.name}] Field '${_name}': dispatching ${ModelClass.name}.importSchema x${data?.length ?? 0}`
          )

        return data?.map((item: any) => ModelClass.importSchema(item, undefined, verbose)) ?? []
      }

      if (element instanceof GcsLazyEmbeddedField) {
        const ModelClass = element.modelClass

        if (verbose)
          console.debug(
            `[GCS Import: ${this.name}] Field '${_name}': dispatching (lazy) ${(ModelClass as any).name}.importSchema x${data?.length ?? 0}`
          )

        return data?.map((item: any) => ModelClass.importSchema(item, undefined, verbose)) ?? []
      }

      return data?.map((item: any) => item ?? element.getInitialValue()) ?? []
    }

    if (field instanceof fields.EmbeddedDataField) {
      const ModelClass = field.model as typeof GcsElement

      if (verbose)
        console.debug(`[GCS Import: ${this.name}] Field '${_name}': dispatching ${ModelClass.name}.importSchema`)

      return ModelClass.importSchema(data ?? {}, undefined, verbose)
    }

    if (field instanceof fields.SchemaField) {
      return this.importSchema(data ?? field.getInitialValue(), (field as fields.SchemaField<any>).fields, verbose)
    }

    console.warn(`[GCS Import] Unsupported field type ${field.constructor.name} for key '${_name}'`)
  }

  /* ---------------------------------------- */

  static processReplacements(data: string, replacements: Record<string, string>): string | null
  static processReplacements(data: string[], replacements: Record<string, string>): string[] | null
  static processReplacements(data: string | string[], replacements: Record<string, string>): string | string[] | null {
    const process = (datum: string) => {
      for (const key of Object.keys(replacements)) {
        const pattern = new RegExp('@' + key + '@', 'g')

        if (datum.match(pattern)) datum = datum.replace(pattern, replacements[key])
      }

      return datum
    }

    if (typeof data === 'string') return process(data)
    if (Array.isArray(data)) return data.map(datum => process(datum))

    return null
  }

  /* ---------------------------------------- */

  /**
   * Is this the root element?
   */
  get isRoot(): boolean {
    return false
  }

  /* ---------------------------------------- */

  /** @abstract */
  get isContainer(): boolean {
    return false
  }

  /* ---------------------------------------- */

  /** @abstract */
  get isEnabled(): boolean {
    return true
  }
}

/* ---------------------------------------- */

type GcsItemMetaData<
  Child extends typeof GcsItem<any> = typeof GcsItem<any>,
  Modifier extends typeof GcsItem<any> = typeof GcsItem<any>,
> = {
  childClass: null | Child
  modifierClass: null | Modifier
  weaponClass: null | typeof GcsElement<any>
}

class GcsItem<Schema extends fields.DataSchema = fields.DataSchema> extends GcsElement<Schema> {
  static metadata: GcsItemMetaData = {
    childClass: null,
    modifierClass: null,
    weaponClass: null,
  }

  /* ---------------------------------------- */

  get metadata(): GcsItemMetaData {
    return (this.constructor as typeof GcsItem).metadata
  }

  /* ---------------------------------------- */

  get childItems() {
    if (this.metadata.childClass === null) return []

    return ((this as any).children ?? []).map((childData: any) =>
      this.metadata.childClass?.fromImportData(childData, this)
    )
  }

  get allChildItems() {
    const children = this.childItems

    children.forEach((child: GcsItem) => {
      if (child.isContainer) children.push(...child.allChildItems)
    })

    return children
  }

  /* ---------------------------------------- */

  get modifierItems() {
    if (this.metadata.modifierClass === null) return []

    return ((this as any).modifiers ?? []).map((modifierData: any) =>
      this.metadata.modifierClass?.fromImportData(modifierData, this)
    )
  }

  /* ---------------------------------------- */

  get weaponItems() {
    if (this.metadata.weaponClass === null) return []

    return ((this as any).weapons ?? []).map((weaponData: any) =>
      this.metadata.weaponClass?.fromImportData(weaponData, this)
    )
  }
}

/* ---------------------------------------- */

class GcsCollection<
  T extends DataModel.AnyConstructor = DataModel.AnyConstructor,
  Schema extends GcsCollectionSchema<T> = GcsCollectionSchema<T>,
> extends GcsElement<Schema> {}

const gcsCollectionSchema = <T extends DataModel.AnyConstructor>(type: T) => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    type: new fields.StringField({ required: true, nullable: false }),
    version: new fields.NumberField({ required: true, nullable: false }),
    rows: new fields.ArrayField(new fields.EmbeddedDataField(type), { required: true, nullable: false }),
  }
}

type GcsCollectionSchema<T extends DataModel.AnyConstructor> = ReturnType<typeof gcsCollectionSchema<T>>

/* ---------------------------------------- */

export {
  GcsElement,
  GcsItem,
  GcsLazyEmbeddedField,
  sourcedIdSchema,
  type SourcedIdSchema,
  GcsCollection,
  gcsCollectionSchema,
  type GcsCollectionSchema,
}
