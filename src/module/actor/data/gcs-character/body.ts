import { fields } from '@gurps-types/foundry/index.js'
import {
  PseudoDocument,
  PseudoDocumentMetadata,
  pseudoDocumentSchema,
} from '@module/pseudo-document/pseudo-document.js'
import { AnyObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

interface GcsSubTableConstructorOptions extends AnyObject {
  owningLocation: string
}

class GcsSubTable extends PseudoDocument<GcsSubTableSchema, GcsBody, GcsSubTableConstructorOptions> {
  locations: GcsHitLocation[] = []

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'LocationSubTable',
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  /**
   * Remove the false `_id` field of GcsBody from the fieldPath
   */
  override get fieldPath(): string {
    let path = (this.parent.constructor as unknown as gurps.MetaDataOwner).metadata.embedded[this.documentName]

    if (this.parent instanceof PseudoDocument) path = [this.parent.fieldPath, path].join('.')

    return path
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsSubTableSchema {
    return gcsSubTableSchema()
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  override prepareBaseData() {
    this.locations = Object.values(this.parent._locations).filter(location => location._owningTable === this._id)
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

class GcsHitLocation extends PseudoDocument<GcsHitLocationSchema, GcsBody, GcsHitLocationConstructorOptions> {
  subTable: GcsSubTable | null = null

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'HitLocation',
      label: '',
      icon: '',
      embedded: {},
    }
  }

  /* ---------------------------------------- */

  /**
   * Remove the false `_id` field of GcsBody from the fieldPath
   */
  override get fieldPath(): string {
    let path = (this.parent.constructor as unknown as gurps.MetaDataOwner).metadata.embedded[this.documentName]

    if (this.parent instanceof PseudoDocument) path = [this.parent.fieldPath, path].join('.')

    return path
  }

  /* ---------------------------------------- */

  static override defineSchema(): GcsHitLocationSchema {
    return gcsHitLocationSchema()
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  override prepareBaseData() {
    this.subTable =
      Object.values(this.parent._subTables).find(subTable => subTable._owningLocation === this._id) || null
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

class GcsBody extends PseudoDocument<GcsBodySchema> {
  locations: GcsHitLocation[] = []

  /* ---------------------------------------- */

  static override defineSchema(): GcsBodySchema {
    return gcsBodySchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'Body',
      label: '',
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
