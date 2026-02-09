import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { AnyObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

interface GcsSubTableConstructorOptions extends AnyObject {
  owningLocation: string
}

class GcsSubTable extends DataModel<GcsSubTableSchema, GcsBody, GcsSubTableConstructorOptions> {
  constructor(
    data: DataModel.CreateData<GcsSubTableSchema>,
    options: DataModel.ConstructionContext<GcsBody> & GcsSubTableConstructorOptions
  ) {
    data._owningLocation = options.owningLocation
    super(data, options)
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsSubTableSchema {
    return gcsSubTableSchema()
  }

  /* ---------------------------------------- */

  get loations(): GcsHitLocation[] {
    return Object.values(this.parent._locations).filter(location => location._owningTable === this._id)
  }
}

const gcsSubTableSchema = () => {
  return {
    // Name      string         `json:"name,omitzero"`
    // Roll      *dice.Dice     `json:"roll"`
    // Locations []*HitLocation `json:"locations,omitzero"`
    // TODO: Replace with dice field
    roll: new fields.StringField({ required: true, nullable: false }),
    _id: new fields.StringField({
      required: true,
      nullable: true,
      readonly: true,
      initial: () => foundry.utils.randomID(),
    }),
    // NOTE: If _owningLocation is null, the location is owned by the top-level table.
    _owningLocation: new fields.StringField({ required: true, nullable: false, readonly: true }),
  }
}

type GcsSubTableSchema = ReturnType<typeof gcsSubTableSchema>

/* ---------------------------------------- */

interface GcsHitLocationConstructorOptions extends AnyObject {
  owningTable: string | null
}

class GcsHitLocation extends DataModel<GcsHitLocationSchema, GcsBody, GcsHitLocationConstructorOptions> {
  constructor(
    data: DataModel.CreateData<GcsHitLocationSchema>,
    options: DataModel.ConstructionContext<GcsBody> & GcsHitLocationConstructorOptions
  ) {
    data._owningTable = options.owningTable
    super(data, options)
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsHitLocationSchema {
    return gcsHitLocationSchema()
  }

  /* ---------------------------------------- */

  get subTable(): GcsSubTable | null {
    return Object.values(this.parent._subTables).find(subTable => subTable._owningLocation === this._id) || null
  }
}

const gcsHitLocationSchema = () => {
  return {
    // LocID       string `json:"id"`
    // ChoiceName  string `json:"choice_name"`
    // TableName   string `json:"table_name"`
    // Slots       int    `json:"slots,omitzero"`
    // HitPenalty  int    `json:"hit_penalty,omitzero"`
    // DRBonus     int    `json:"dr_bonus,omitzero"`
    // Description string `json:"description,omitzero"`
    // Notes       string `json:"notes,omitzero"`
    // SubTable    *Body  `json:"sub_table,omitzero"`

    // NOTE: This _id field is separate form the id field below and is used onyl for relations between locations
    // and sub-tables. The _id values should be unique, whereas id values do not need to be unique. This can
    // be changed if a simpler solution is available.
    _id: new fields.StringField({
      required: true,
      nullable: true,
      readonly: true,
      initial: () => foundry.utils.randomID,
    }),
    // NOTE: If _owningTable is null, the location is owned by the top-level table.
    _owningTable: new fields.StringField({ required: true, nullable: true, readonly: true }),
    id: new fields.StringField({ required: true, nullable: false }),
    choiceName: new fields.StringField({ required: true, nullable: false }),
    tableName: new fields.StringField({ required: true, nullable: false }),
    slots: new fields.NumberField({ required: true, nullable: false }),
    hitPenalty: new fields.NumberField({ required: true, nullable: false }),
    drBonus: new fields.NumberField({ required: true, nullable: false }),
    description: new fields.StringField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false }),
  }
}

type GcsHitLocationSchema = ReturnType<typeof gcsHitLocationSchema>

/* ---------------------------------------- */

class GcsBody extends DataModel<GcsBodySchema> {
  static override defineSchema(): GcsBodySchema {
    return gcsBodySchema()
  }

  /* ---------------------------------------- */

  get locations(): GcsHitLocation[] {
    return Object.values(this._locations).filter(location => location._owningTable === null)
  }
}

const gcsBodySchema = () => {
  return {
    // Name      string         `json:"name,omitzero"`
    // NOTE: name is used only for top-level tables
    name: new fields.StringField({ required: true, nullable: false }),
    roll: new fields.StringField({ required: true, nullable: false }),
    // NOTE: To avoid recursive DataModel errors, all locations are defined at the top-level table.
    // Sub-locations are assigned to subTable by ID. Locations are arranged in terms of position in the locations Array,
    // using the owningTable property in the location table
    _locations: new fields.TypedObjectField(new fields.EmbeddedDataField(GcsHitLocation), {
      required: true,
      nullable: false,
    }),
    _subTables: new fields.TypedObjectField(new fields.EmbeddedDataField(GcsSubTable), {
      required: true,
      nullable: false,
    }),
  }
}

type GcsBodySchema = ReturnType<typeof gcsBodySchema>

/* ---------------------------------------- */

export { GcsBody }
