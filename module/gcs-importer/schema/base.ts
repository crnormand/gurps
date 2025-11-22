import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

const sourcedIdSchema = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    source: new fields.StringField({ required: true, nullable: true }),
  }
}

type SourcedIdSchema = ReturnType<typeof sourcedIdSchema>

/* ---------------------------------------- */

class GcsElement<
  Schema extends fields.DataSchema = fields.DataSchema,
  Parent extends DataModel.Any | null = DataModel.Any | null,
> extends DataModel<Schema, Parent> {
  container: null | GcsElement<any> = null

  static fromImportData<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    parent: null | GcsElement = null
  ): GcsElement<Schema> {
    const createData: DataModel.CreateData<Schema> = this.importSchema(importData, this.defineSchema() as Schema)

    return new this(createData as DataModel.CreateData<Schema>, { parent })
  }

  /* ---------------------------------------- */

  static importSchema<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema = this.defineSchema() as Schema
  ): DataModel.CreateData<Schema> {
    const data: Partial<DataModel.CreateData<Schema>> = {}
    const replacements: Record<string, string> = (importData.replacements as unknown as Record<string, string>) ?? {}

    for (const [key, field] of Object.entries(schema)) {
      ;(data as AnyMutableObject)[key] = this._importField(importData[key], field, key, replacements)
    }

    return data as DataModel.CreateData<Schema>
  }

  /* ---------------------------------------- */

  protected static _importField(
    data: any,
    field: fields.DataField.Any,
    _name: string,
    _replacements: Record<string, string> = {}
  ): any {
    if (
      field instanceof fields.StringField ||
      field instanceof fields.NumberField ||
      field instanceof fields.BooleanField ||
      field instanceof fields.ObjectField
    ) {
      return data ?? field.getInitialValue()
    }

    if (field instanceof fields.ArrayField) {
      return (
        data?.map(
          (item: any) => item ?? (field as fields.ArrayField<fields.DataField.Any>).element.getInitialValue()
        ) ?? []
      )
    }

    if (field instanceof fields.EmbeddedDataField || field instanceof fields.SchemaField) {
      return this.importSchema(data ?? {}, (field as fields.SchemaField<any>).fields)
    }

    console.warn(`Unsupported field type ${field.constructor.name} for import`)
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
    if (Array.isArray(data)) return data.map(e => process(e))

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

  protected static override _importField(
    data: any,
    field: fields.DataField.Any,
    name: string,
    _replacements: Record<string, string> = {}
  ): any {
    switch (name) {
      case 'children':
        if (this.metadata.childClass === null) return null
        return data?.map((childData: any) => this.metadata.childClass?.importSchema(childData))
      case 'modifiers':
        if (this.metadata.modifierClass === null) return null
        return data?.map((modifierData: any) => this.metadata.modifierClass?.importSchema(modifierData))

      case 'weapons':
        if (this.metadata.weaponClass === null) return null
        return data?.map((weaponData: any) => this.metadata.weaponClass?.importSchema(weaponData))
      default:
        return super._importField(data, field, name)
    }
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

  /* ---------------------------------------- */
}

/* ---------------------------------------- */
export { GcsElement, GcsItem, sourcedIdSchema, type SourcedIdSchema }
