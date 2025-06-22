import fields = foundry.data.fields
import { GcsElement } from './base.js'

class GcsHitLocation extends GcsElement<GcsHitLocationData> {
  static override defineSchema(): GcsHitLocationData {
    return hitLocationData()
  }

  /* ---------------------------------------- */
  protected static override _importField(data: any, field: fields.DataField.Any, name: string) {
    if (name === 'sub_table') {
      return data?.map((subTableData: any) => {
        return GcsHitLocation.importSchema(subTableData, GcsHitLocation.defineSchema())
      })
    }
    if (name === 'dr') {
      return data // NOTE: this is a plain object of numbers, no real issue just importing it as is
    }
    return super._importField(data, field, name)
  }
}

/* ---------------------------------------- */

const hitLocationData = () => {
  return {
    id: new fields.StringField({ required: true, nullable: false }),
    choice_name: new fields.StringField({ required: true, nullable: false }),
    table_name: new fields.StringField({ required: true, nullable: false }),
    slots: new fields.NumberField({ required: true, nullable: true }),
    hit_penalty: new fields.NumberField({ required: true, nullable: true }),
    dr_bonus: new fields.NumberField({ required: true, nullable: true }),
    description: new fields.StringField({ required: true, nullable: true }),
    notes: new fields.StringField({ required: true, nullable: true }),
    sub_table: new fields.ObjectField({ required: true, nullable: true }),
    calc: new fields.SchemaField({
      roll_range: new fields.StringField({ required: true, nullable: false }),
      dr: new fields.TypedObjectField(new fields.NumberField({ required: true, nullable: false }), {
        required: true,
        nullable: false,
      }),
    }),
  }
}

type GcsHitLocationData = ReturnType<typeof hitLocationData>

/* ---------------------------------------- */

class GcsBody extends GcsElement<GcsBodyData> {
  static override defineSchema(): GcsBodyData {
    return bodyData()
  }

  /* ---------------------------------------- */

  protected static override _importField(data: any, field: fields.DataField.Any, name: string) {
    if (name === 'locations') {
      return data.map((locationData: any) => {
        return GcsHitLocation.importSchema(locationData, GcsHitLocation.defineSchema())
      })
    }
    return super._importField(data, field, name)
  }
}

/* ---------------------------------------- */

const bodyData = () => {
  return {
    name: new fields.StringField({ required: true, nullable: false }),
    roll: new fields.StringField({ required: true, nullable: false }),
    locations: new fields.ArrayField(new fields.EmbeddedDataField(GcsHitLocation), { required: true, nullable: false }),
  }
}

type GcsBodyData = ReturnType<typeof bodyData>

/* ---------------------------------------- */

export { GcsBody, bodyData, type GcsBodyData }
