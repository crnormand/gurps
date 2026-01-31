import { fields, DataModel } from '../../types/foundry/index.ts'

import { type GcsCharacterModel } from './gcs-character.ts'

enum AttributeType {
  Integer = 'integer',
  IntegerRef = 'integerRef',
  Decimal = 'decimal',
  DecimalRef = 'decimalRef',
  Pool = 'pool',
  PoolRef = 'poolRef',
  PrimarySeparator = 'primarySeparator',
  SecondarySeparator = 'secondarySeparator',
  PoolSeparator = 'poolSeparator',
}

/* ---------------------------------------- */

enum GcsAttributePlacement {
  Automatic = 'automatic',
  Primary = 'primary',
  Secondary = 'secondary',
  Hidden = 'hidden',
}

/* ---------------------------------------- */

enum GcsAttriuteKind {
  Primary = 'primary',
  Secondary = 'secondary',
  Pool = 'pool',
}

/* ---------------------------------------- */

class GcsAttributeDefinition extends DataModel<GcsAttributeDefinitionSchema, GcsCharacterModel> {
  static TYPES = AttributeType
  static PLACEMENTS = GcsAttributePlacement

  /* ---------------------------------------- */

  static override defineSchema(): GcsAttributeDefinitionSchema {
    return attributeDefinitionSchema()
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

  get isDecimal(): boolean {
    return this.type === AttributeType.Decimal || this.type === AttributeType.DecimalRef
  }

  /* ---------------------------------------- */

  get kind(): GcsAttriuteKind {
    if (this.isPool) return GcsAttriuteKind.Pool
    if (this.isPrimary) return GcsAttriuteKind.Primary
    if (this.isSecondary) return GcsAttriuteKind.Secondary
    throw new Error(`GcsAttributeDefinition: Unable to determine kind for attribute definition ID ${this.id}`)
  }

  /* ---------------------------------------- */

  get resolvedFullName(): string {
    if (this.fullName === '') return this.name

    return this.fullName
  }
}

/* ---------------------------------------- */

const attributeThresholdSchema = () => {
  return {
    // State       string         `json:"state"`
    // Value       string         `json:"value"`
    // Explanation string         `json:"explanation,omitzero"`
    // Ops         []threshold.Op `json:"ops,omitzero"`
    state: new fields.StringField({ required: true, nullable: false }),
    value: new fields.StringField({ required: true, nullable: false }),
    explanation: new fields.StringField({ required: true, nullable: false }),
    // NOTE: STUB. This field is used to store operation names (as strings) which correspond to
    // halving values like ST, Move, etc. at the given threshold. There may be a better way of
    // storing this information.
    ops: new fields.ArrayField(new fields.StringField()),
  }
}

/* ---------------------------------------- */

// NOTE: AttributeDef should likely be defined as a DataModel rather than a simple schema, as the corresponding
// GCS object includes accessors fields which a SchemaField does not permit.
const attributeDefinitionSchema = () => {
  return {
    // DefID               string              `json:"id"`
    // Type                attribute.Type      `json:"type"`
    // Placement           attribute.Placement `json:"placement,omitzero"`
    // Name                string              `json:"name"`
    // FullName            string              `json:"full_name,omitzero"`
    // Base                string              `json:"base,omitzero"`
    // CostPerPoint        fxp.Int             `json:"cost_per_point,omitzero"`
    // CostAdjPercentPerSM fxp.Int             `json:"cost_adj_percent_per_sm,omitzero"`
    // Thresholds          []*PoolThreshold    `json:"thresholds,omitzero"`
    // NOTE: The .initial value of this field is a temporary placeholder. GCS generates a new ID
    // as an alphanumeric (plus _) string of minimum length to ensure there are no duplicate ID keys.
    // Therefore, it should cycle through "a" -> "z", then "aa" etc.
    id: new fields.StringField({ required: true, nullable: false, blank: false, initial: 'a' }),
    // TODO: STUB. Include enum or enumlike values for attribute types
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(AttributeType),
      initial: AttributeType.Integer,
    }),
    // TODO: STUB. Include enum or enumlike values for attribute placement
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
    base: new fields.StringField({ required: true, nullable: false }),
    costPerPoint: new fields.NumberField({ requried: true, nullable: false, initial: 0 }),
    // NOTE: Should be displayed as a percentage
    costAdjPerSm: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    // TODO: Check if required and nullable even works for array fields
    thresholds: new fields.ArrayField(new fields.SchemaField(attributeThresholdSchema()), {
      required: true,
      nullable: true,
    }),
  }
}

type GcsAttributeDefinitionSchema = ReturnType<typeof attributeDefinitionSchema>

/* ---------------------------------------- */

export { GcsAttributeDefinition }
