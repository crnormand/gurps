import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'
import fields = foundry.data.fields
import DataModel = foundry.abstract.DataModel

/* ---------------------------------------- */

class GcsElement<
  Schema extends fields.DataSchema = fields.DataSchema,
  Parent extends DataModel.Any | null = DataModel.Any | null,
> extends DataModel<Schema, Parent> {
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
    switch (field.constructor) {
      case fields.StringField:
      case fields.NumberField:
      case fields.BooleanField:
      case fields.ObjectField:
        return data ?? field.getInitialValue()
      case fields.ArrayField:
        return (
          data?.map(
            (item: any) => item ?? (field as fields.ArrayField<fields.DataField.Any>).element.getInitialValue()
          ) ?? []
        )

      case fields.EmbeddedDataField:
      case fields.SchemaField:
        return this.importSchema(data ?? {}, (field as fields.SchemaField<any>).fields)
    }
  }
}

class GcsItem<Schema extends fields.DataSchema = fields.DataSchema> extends GcsElement<Schema> {}

export { GcsElement, GcsItem }
