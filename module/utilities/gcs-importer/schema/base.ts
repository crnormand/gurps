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

class GcsElement<Schema extends fields.DataSchema> extends DataModel<Schema> {
  static fromImportData<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema = this.defineSchema() as Schema
  ): GcsElement<Schema> {
    const createData: DataModel.CreateData<Schema> = this.importSchema(importData, schema)

    return new this(createData as DataModel.CreateData<Schema>)
  }

  /* ---------------------------------------- */

  static importSchema<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema = this.defineSchema() as Schema
  ): DataModel.CreateData<Schema> {
    const data: Partial<DataModel.CreateData<Schema>> = {}

    for (const [key, field] of Object.entries(schema)) {
      ;(data as AnyMutableObject)[key] = this._importField(importData[key], field, key)
    }

    return data as DataModel.CreateData<Schema>
  }

  /* ---------------------------------------- */

  protected static _importField(data: any, field: fields.DataField.Any, _name: string): any {
    switch (field.constructor) {
      case fields.StringField:
      case fields.NumberField:
      case fields.BooleanField:
      case fields.ObjectField:
        return data ?? field.getInitialValue()
      case fields.SchemaField: {
        return this.importSchema(data ?? {}, (field as fields.SchemaField<any>).fields)
      }
    }
  }
}

/* ---------------------------------------- */

type GcsItemMetaData = {
  childClass: null | typeof GcsItem<any>
  modifierClass: null | typeof GcsItem<any>
}

class GcsItem<Schema extends fields.DataSchema> extends GcsElement<Schema> {
  static metadata: GcsItemMetaData = {
    childClass: null,
    modifierClass: null,
  }

  /* ---------------------------------------- */

  get metadata(): GcsItemMetaData {
    return (this.constructor as typeof GcsItem).metadata
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any, name: string): any {
    switch (name) {
      case 'children':
        if (this.metadata.childClass === null) return null
        return data?.map((childData: any) => this.metadata.childClass?.importSchema(childData))
      case 'modifiers':
        if (this.metadata.modifierClass === null) return null
        return data?.map((modifierData: any) => this.metadata.modifierClass?.importSchema(modifierData))
      default:
        return super._importField(data, field, name)
    }
  }

  /* ---------------------------------------- */

  get childItems(): GcsItem<any>[] {
    return ((this as any).children ?? []).map((childData: any) => this.metadata.childClass?.fromImportData(childData))
  }

  /* ---------------------------------------- */

  get modifierItems(): GcsItem<any>[] {
    return ((this as any).modifiers ?? []).map((modifierData: any) =>
      this.metadata.modifierClass?.fromImportData(modifierData)
    )
  }

  /* ---------------------------------------- */
}

/* ---------------------------------------- */
export { GcsElement, GcsItem, sourcedIdSchema, type SourcedIdSchema }
