import fields = foundry.data.fields
import { GcsElement } from './base.js'

class GcsHitLocation extends GcsElement<GcsHitLocationData> {
  static override defineSchema(): GcsHitLocationData {
    return hitLocationData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any) {
    if (field.name === 'sub_table') {
      return data?.map((subTableData: any) => {
        return GcsHitLocation.fromImportData(subTableData, GcsHitLocation.schema.fields)
      })
    }
    return super._importField(data, field)
  }
}

/* ---------------------------------------- */

const hitLocationData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    choice_name: new fields.StringField({ required: true, nullable: false }),
    table_name: new fields.StringField({ required: true, nullable: false }),
    slots: new fields.NumberField({ required: true, nullable: false }),
    hit_penalty: new fields.NumberField({ required: true, nullable: false }),
    dr_bonus: new fields.NumberField({ required: true, nullable: false }),
    description: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
    sub_table: new fields.ObjectField(),
  }
}

type GcsHitLocationData = ReturnType<typeof hitLocationData>

/* ---------------------------------------- */

class GcsBody extends GcsElement<GcsBodyData> {
  static override defineSchema(): GcsBodyData {
    return bodyData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any) {
    if (field.name === 'locations') {
      return data[field.name].map((locationData: any) => {
        return GcsHitLocation.fromImportData(locationData, GcsHitLocation.schema.fields)
      })
    }
    return super._importField(data, field)
  }
}

/* ---------------------------------------- */

const bodyData = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    roll: new fields.StringField({ required: true, nullable: false }),
    locations: new fields.ArrayField(new fields.ObjectField(), { required: true, nullable: false }),
  }
}

type GcsBodyData = ReturnType<typeof bodyData>

/* ---------------------------------------- */

export { GcsBody, bodyData, type GcsBodyData }
