import { fields } from '@gurps-types/foundry/index.js'
import {
  PseudoDocument,
  PseudoDocumentMetadata,
  pseudoDocumentSchema,
} from '@module/pseudo-document/pseudo-document.js'
import { ScriptAttribute } from '@module/scripting/adapters/attribute.js'
import { ScriptResolver } from '@module/scripting/resolver.js'

import { AttributeThreshold } from './attribute-threshold.js'
import { GcsAttribute } from './attribute.js'
import { type GcsCharacterModel } from './gcs-character.js'
import { AttributeType, GcsAttributeKind, GcsAttributePlacement, GcsThresholdOp } from './types.js'

/* ---------------------------------------- */

class GcsAttributeDefinition extends PseudoDocument<GcsAttributeDefinitionSchema, GcsCharacterModel> {
  static TYPES = AttributeType
  static KINDS = GcsAttributeKind
  static PLACEMENTS = GcsAttributePlacement
  static OPS = GcsThresholdOp

  /* ---------------------------------------- */

  thresholds: AttributeThreshold[] = []

  /* ---------------------------------------- */

  static override defineSchema(): GcsAttributeDefinitionSchema {
    return attributeDefinitionSchema()
  }

  /* ---------------------------------------- */

  static override get metadata(): PseudoDocumentMetadata {
    return {
      documentName: 'AttributeDefinition',
      label: '',
      icon: '',
      embedded: { AttributeThreshold: '_thresholds' },
    }
  }

  /* ---------------------------------------- */
  /*   Data Preparation                       */
  /* ---------------------------------------- */

  /**
   * Prepare base data. This method is not called automatically; it is the responsibility
   * of the parent document to ensure pseudo-documents prepare base and derived data.
   */
  override prepareBaseData() {
    if (this._thresholds) {
      const thresholds = Object.values(this._thresholds)

      foundry.utils.performIntegerSort(thresholds)
      this.thresholds = thresholds
    }
  }

  /* ---------------------------------------- */
  /*   Instance Methods                       */
  /* ---------------------------------------- */

  baseValue(att: GcsAttribute): number {
    if (this.isSeparator) return 0

    return ScriptResolver.resolveToNumber(att.actor, ScriptAttribute.newProvider(att), this.base)
  }

  /* ---------------------------------------- */

  get isPrimary(): boolean {
    if (this.type === AttributeType.PrimarySeparator) return true
    if (
      this.type === AttributeType.Pool ||
      this.type === AttributeType.PoolRef ||
      this.placement === GcsAttributePlacement.Secondary ||
      this.isSeparator
    )
      return false
    if (this.placement === GcsAttributePlacement.Primary) return true
    const value = Number(this.base)

    return !isNaN(value)
  }

  /* ---------------------------------------- */

  get isSecondary(): boolean {
    if (this.type === AttributeType.SecondarySeparator) return true
    if (
      this.type === AttributeType.Pool ||
      this.type === AttributeType.PoolRef ||
      this.placement === GcsAttributePlacement.Primary ||
      this.isSeparator
    )
      return false
    if (this.placement === GcsAttributePlacement.Secondary) return true

    const value = Number(this.base)

    return isNaN(value)
  }

  /* ---------------------------------------- */

  get isPool(): boolean {
    return (
      this.type === AttributeType.Pool ||
      this.type === AttributeType.PoolRef ||
      this.type === AttributeType.PoolSeparator
    )
  }

  /* ---------------------------------------- */

  get isSeparator(): boolean {
    return (
      this.type === AttributeType.PrimarySeparator ||
      this.type === AttributeType.SecondarySeparator ||
      this.type === AttributeType.PoolSeparator
    )
  }

  get allowsDecimal(): boolean {
    return this.type === AttributeType.Decimal || this.type === AttributeType.DecimalRef
  }

  /* ---------------------------------------- */

  get kind(): GcsAttributeKind {
    if (this.isPool) return GcsAttributeKind.Pool
    if (this.isPrimary) return GcsAttributeKind.Primary
    if (this.isSecondary) return GcsAttributeKind.Secondary
    throw new Error(`GcsAttributeDefinition: Unable to determine kind for attribute definition ID ${this.id}`)
  }

  /* ---------------------------------------- */

  get resolvedFullName(): string {
    if (this.fullName === '') return this.name

    return this.fullName
  }
}

/* ---------------------------------------- */

// NOTE: AttributeDef should likely be defined as a DataModel rather than a simple schema, as the corresponding
// GCS object includes accessors fields which a SchemaField does not permit.
const attributeDefinitionSchema = () => {
  return {
    ...pseudoDocumentSchema(),
    sort: new fields.IntegerSortField({ required: true, nullable: false, initial: 0 }),
    // NOTE: The .initial value of this field is a temporary placeholder. GCS generates a new ID
    // as an alphanumeric (plus _) string of minimum length to ensure there are no duplicate ID keys.
    // Therefore, it should cycle through "a" -> "z", then "aa" etc.
    attrId: new fields.StringField({ required: true, nullable: false, blank: false, initial: 'a' }),
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(AttributeType),
      initial: AttributeType.Integer,
    }),
    placement: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(GcsAttributePlacement),
      initial: GcsAttributePlacement.Automatic,
    }),
    name: new fields.StringField({ required: true, nullable: false }),
    fullName: new fields.StringField({ required: true, nullable: false }),
    // NOTE: This is parsed as JS code, but no type yet exists for this.
    // TODO: Create dedicated JS code type.
    base: new fields.JavaScriptField({ required: true, nullable: false }),
    costPerPoint: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // NOTE: Should be displayed as a percentage
    costAdjPerSm: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // TODO: Check if required and nullable even works for array fields
    _thresholds: new fields.TypedObjectField(
      new fields.EmbeddedDataField(AttributeThreshold, { required: true, nullable: false }),
      {
        required: false,
        nullable: true,
      }
    ),
  }
}

type GcsAttributeDefinitionSchema = ReturnType<typeof attributeDefinitionSchema>

/* ---------------------------------------- */

export { GcsAttributeDefinition, AttributeType, GcsAttributePlacement, GcsAttributeKind }
