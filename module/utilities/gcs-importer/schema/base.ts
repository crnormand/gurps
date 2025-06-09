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
    schema: Schema = this.schema.fields
  ): GcsElement<Schema> {
    const createData: DataModel.CreateData<Schema> = this._importSchema(importData, schema)

    return new this(createData as DataModel.CreateData<Schema>)
  }

  /* ---------------------------------------- */

  protected static _importSchema<Schema extends fields.DataSchema>(
    importData: Partial<Schema> & AnyObject,
    schema: Schema
  ): DataModel.CreateData<Schema> {
    const data: Partial<DataModel.CreateData<Schema>> = {}

    for (const [key, field] of Object.entries(schema)) {
      ;(data as AnyMutableObject)[key] = this._importField(importData[key], field)
    }

    return data as DataModel.CreateData<Schema>
  }

  /* ---------------------------------------- */

  protected static _importField(data: any, field: fields.DataField.Any): any {
    switch (field.constructor) {
      case fields.StringField:
      case fields.NumberField:
      case fields.BooleanField:
      case fields.ObjectField:
        return data ?? field.getInitialValue()
      case fields.SchemaField:
        return data === undefined || data === null
          ? null
          : Object.keys((field as fields.SchemaField<any>).fields).reduce((obj: any, key) => {
              obj[key] = this._importField(data[key], (field as unknown as fields.SchemaField<any>).fields[key])
              return obj
            }, {})
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

  protected static override _importField(data: any, field: fields.DataField.Any): any {
    if (this.metadata.childClass !== null && field.name === 'children') {
      return this._importChildren(data ?? null)
    }
    if (this.metadata.modifierClass !== null && field.name === 'modifiers') {
      return this._importModifiers(data ?? null)
    }
    return super._importField(data, field)
  }

  /* ---------------------------------------- */

  protected static _importChildren<Schema extends fields.DataSchema>(
    data: Partial<DataModel.CreateData<Schema>>[] | null
  ): GcsItem<any>[] {
    if (data === null || data === undefined) return []

    const childClass: null | typeof GcsItem<any> = this.metadata.childClass
    if (childClass === null) return []

    return data.map(child => {
      return childClass?.fromImportData(child as any, childClass.schema.fields)
    })
  }

  /* ---------------------------------------- */

  protected static _importModifiers<Schema extends fields.DataSchema>(
    data: Partial<DataModel.CreateData<Schema>>[] | null
  ): GcsItem<any>[] {
    if (data === null || data === undefined) return []

    const modifierClass: null | typeof GcsItem<any> = this.metadata.modifierClass
    if (modifierClass === null) return []

    return data.map(modifier => {
      return modifierClass?.fromImportData(modifier as any, modifierClass.schema.fields)
    })
  }
}

/* ---------------------------------------- */

export { GcsElement, GcsItem, sourcedIdSchema, type SourcedIdSchema }
