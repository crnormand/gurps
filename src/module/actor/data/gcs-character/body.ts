import { fields, DataModel } from '@gurps-types/foundry/index.js'
import { CollectionField } from '@module/data/fields/collection-field.js'
import { PseudoDocument, pseudoDocumentSchema } from '@module/pseudo-document/pseudo-document.js'
import { AnyObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

interface GcsSubTableConstructorOptions extends AnyObject {
  owningLocation: string
}

/** The parent type is DataModel.Any to avoid circular dependencies with GcsBody */
class GcsSubTable extends PseudoDocument<GcsSubTableSchema, DataModel.Any, GcsSubTableConstructorOptions> {
  locations: GcsHitLocation[] = []

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'LocationSubTable'> {
    return {
      documentName: 'LocationSubTable',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  /**
   * Remove the false `_id` field of GcsBody from the fieldPath
   */
  override get fieldPath(): string {
    let path = (this.parent.constructor as unknown as gurps.MetadataOwner).metadata.embedded[this.documentName]

    if (this.parent instanceof PseudoDocument) path = [this.parent.fieldPath, path].join('.')

    return path
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsSubTableSchema {
    return gcsSubTableSchema()
  }

  /* ---------------------------------------- */

  get root(): GcsBody {
    return this.parent as GcsBody
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  override prepareBaseData() {
    this.locations = Object.values(this.root._locations).filter(location => location._owningTable === this._id)
  }
}

const gcsSubTableSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    // TODO: Replace with dice field
    roll: new fields.StringField({ required: true, nullable: false }),
    sort: new fields.IntegerSortField({ required: true, nullable: false, initial: 0 }),
    // NOTE: If _owningLocation is null, the location is owned by the top-level table.
    _owningLocation: new fields.StringField({ required: true, nullable: false, readonly: true }),
  }
}

type GcsSubTableSchema = ReturnType<typeof gcsSubTableSchema>

/* ---------------------------------------- */

interface GcsHitLocationConstructorOptions extends AnyObject {
  owningTable: string | null
}

/** The parent type is DataModel.Any to avoid circular dependencies with GcsBody */
class GcsHitLocation extends PseudoDocument<GcsHitLocationSchema, DataModel.Any, GcsHitLocationConstructorOptions> {
  subTable: GcsSubTable | null = null

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'HitLocation'> {
    return {
      documentName: 'HitLocation',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  /**
   * Remove the false `_id` field of GcsBody from the fieldPath
   */
  override get fieldPath(): string {
    let path = (this.parent.constructor as unknown as gurps.MetadataOwner).metadata.embedded[this.documentName]

    if (this.parent instanceof PseudoDocument) path = [this.parent.fieldPath, path].join('.')

    return path
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsHitLocationSchema {
    return gcsHitLocationSchema()
  }

  /* ---------------------------------------- */

  get root(): GcsBody {
    return this.parent as GcsBody
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  override prepareBaseData() {
    if (this.root._subTables) {
      this.subTable =
        Object.values(this.root._subTables).find(subTable => subTable._owningLocation === this._id) || null
    }
  }
}

const gcsHitLocationSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    sort: new fields.IntegerSortField({ required: true, nullable: false, initial: 0 }),
    // NOTE: If _owningTable is null, the location is owned by the top-level table.
    _owningTable: new fields.StringField({ required: true, nullable: true, readonly: true }),
    locationId: new fields.StringField({ required: true, nullable: false }),
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

class GcsBody extends PseudoDocument<GcsBody.Schema> {
  locations: GcsHitLocation[] = []

  /* ---------------------------------------- */

  static override defineSchema(): GcsBody.Schema {
    return gcsBodySchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocument.Metadata<'Body'> {
    return {
      documentName: 'Body',
      icon: '',
      embedded: {
        HitLocation: '_locations',
        LocationSubTable: '_subTables',
      },
    }
  }
}

const gcsBodySchema = () => {
  return {
    // NOTE: _id is not used for BodyType but is required for the PseudoDocument spec.
    ...pseudoDocumentSchema(),
    // NOTE: name is used only for top-level tables
    name: new fields.StringField({ required: true, nullable: false }),
    roll: new fields.StringField({ required: true, nullable: false }),
    // NOTE: To avoid recursive DataModel errors, all locations are defined at the top-level table.
    // Sub-locations are assigned to subTable by ID. Locations are arranged in terms of position in the locations Array,
    // using the owningTable property in the location table
    _locations: new CollectionField(GcsHitLocation),
    _subTables: new CollectionField(GcsSubTable, { required: false }),
  }
}

/* ---------------------------------------- */

namespace GcsBody {
  export type Schema = ReturnType<typeof gcsBodySchema>
}

/* ---------------------------------------- */

export { GcsBody }
