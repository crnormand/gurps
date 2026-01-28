import { AnyObject } from 'fvtt-types/utils'

import { DataModel, fields } from '../../types/foundry/index.ts'

enum WeightUnit {
  Pound = 'lb',
  PoundAlt = '#',
  Ounce = 'oz',
  Ton = 'tn',
  TonAlt = 't',
  Kilogram = 'kg',
  Gram = 'g',
}

/* ---------------------------------------- */

const weightSchema = () => {
  return {
    value: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
    unit: new fields.StringField({
      required: true,
      nullable: false,
      choices: Object.values(WeightUnit),
      initial: WeightUnit.Pound,
    }),
  }
}

type WeightSchema = ReturnType<typeof weightSchema>

/* ---------------------------------------- */

class Weight<Parent extends DataModel.Any | null = DataModel.Any | null> extends DataModel<WeightSchema, Parent> {
  // Provide a Constructor for the Weight class to allow for testing.
  constructor(data: { value: number; unit: WeightUnit }, parent?: Parent) {
    super(data, parent === null ? undefined : parent)
    this.value = data.value
    this.unit = data.unit
  }

  /* ---------------------------------------- */
  /*  Static Properties                       */
  /* ---------------------------------------- */

  static Unit = WeightUnit

  /* ---------------------------------------- */

  // Maximum number of decimal places to display
  static ROUNDING_PRECISION = 4

  /* ---------------------------------------- */

  static UNIT_LABELS: Record<WeightUnit, string[]> = {
    [Weight.Unit.Pound]: ['lb', 'pound', 'pounds', '#'],
    [Weight.Unit.PoundAlt]: ['lb', 'pound', 'pounds', '#'],
    [Weight.Unit.Ounce]: ['oz', 'ounce', 'ounces'],
    [Weight.Unit.Ton]: ['tn', 't', 'ton', 'tonne', 'tons', 'tonnes'],
    [Weight.Unit.TonAlt]: ['tn', 't', 'ton', 'tonne', 'tons', 'tonnes'],
    [Weight.Unit.Kilogram]: ['kg', 'kilogram', 'kilograms'],
    [Weight.Unit.Gram]: ['g', 'gram', 'grams'],
  }

  /* ---------------------------------------- */

  // Everything is relative to the pound, using GURPS simplified weights only
  static UNIT_CONVERSIONS: Record<WeightUnit, number> = {
    [Weight.Unit.Pound]: 1,
    [Weight.Unit.PoundAlt]: 1,
    [Weight.Unit.Ounce]: 16,
    [Weight.Unit.Ton]: 2000,
    [Weight.Unit.TonAlt]: 2000,
    [Weight.Unit.Kilogram]: 1 / 2,
    [Weight.Unit.Gram]: 500,
  }

  /* ---------------------------------------- */

  static UNIT_NAMES: Record<WeightUnit, string> = Object.fromEntries(
    Object.entries(Weight.Unit).map(([key, value]) => {
      return [key, game.i18n?.localize(`GURPS.${value}`) ?? '']
    })
  ) as Record<WeightUnit, string>

  /* ---------------------------------------- */
  /*  Static Methods                          */
  /* ---------------------------------------- */

  static override defineSchema(): WeightSchema {
    return weightSchema()
  }

  /* ---------------------------------------- */

  /**
   * If forced is true, return 0 if the string is empty or invalid
   */
  static from(value: unknown, defaultUnits: WeightUnit): Weight | null
  static from(value: unknown, defaultUnits: WeightUnit, forced: false): Weight | null
  static from(value: unknown, defaultUnits: WeightUnit, forced: true): Weight
  static from(value: unknown, defaultUnits: WeightUnit, forced: boolean): Weight | null

  static from(value: unknown, defaultUnits: WeightUnit, forced: boolean = false): Weight | null {
    function returnNull() {
      if (forced) return new Weight({ value: 0, unit: Weight.Unit.Pound })
      console.error('Invalid weight value', value)

      return null
    }

    if (typeof value === 'number') {
      return Weight.fromString(`${value}`, defaultUnits, forced)
    } else if (typeof value === 'string') {
      return Weight.fromString(value, defaultUnits, forced)
    }

    return returnNull()
  }

  /* ---------------------------------------- */

  /**
   * If forced is true, return 0 if the string is empty or invalid
   */
  static fromString(text: string, defaultUnits: WeightUnit): Weight | null
  static fromString(text: string, defaultUnits: WeightUnit, forced: false): Weight | null
  static fromString(text: string, defaultUnits: WeightUnit, forced: boolean): Weight | null
  static fromString(text: string, defaultUnits: WeightUnit, forced: true): Weight

  static fromString(text: string, defaultUnits: WeightUnit, forced: boolean = false): Weight | null {
    function returnNull() {
      if (forced) return new Weight({ value: 0, unit: Weight.Unit.Pound })

      console.error('Invalid weight string', text)

      return null
    }

    text = text.trim().replace(/^\++/g, '')

    for (const [unit, labels] of Object.entries(Weight.UNIT_LABELS)) {
      for (const label of labels) {
        if (text.endsWith(label)) {
          const value = parseFloat(text.slice(0, -label.length).trim())

          if (isNaN(value)) return returnNull()

          return new Weight({ value, unit: unit as WeightUnit })
        }
      }
    }

    const value = parseFloat(text)

    if (isNaN(value)) return returnNull()

    return new Weight({ value, unit: defaultUnits })
  }

  /* ---------------------------------------- */

  static unitFromString(text: string): WeightUnit {
    for (const [unit, labels] of Object.entries(Weight.UNIT_LABELS)) {
      if (labels.some(label => text.endsWith(label))) return unit as WeightUnit
    }

    return WeightUnit.Pound
  }

  /* ---------------------------------------- */

  static objectToString(data: { value: number; unit: WeightUnit }): string {
    return `${Math.round(data.value * Math.pow(10, Weight.ROUNDING_PRECISION)) / Math.pow(10, Weight.ROUNDING_PRECISION)} ${Weight.UNIT_LABELS[data.unit][0]}`
  }

  /* ---------------------------------------- */
  /*  Instance Methods                        */
  /* ---------------------------------------- */

  to(unit: WeightUnit): Weight {
    return new Weight({
      value: (this.value * Weight.UNIT_CONVERSIONS[this.unit]) / Weight.UNIT_CONVERSIONS[unit],
      unit,
    })
  }

  /* ---------------------------------------- */

  override toString(): string {
    return Weight.objectToString({ value: this.value, unit: this.unit })
  }
}

/* ---------------------------------------- */

namespace WeightField {
  export type Options = fields.EmbeddedDataField.Options<typeof Weight>

  /* ---------------------------------------- */

  export type DefaultOptions = fields.EmbeddedDataField.DefaultOptions

  /* ---------------------------------------- */

  export type AssignmentType<Opts extends Options> = fields.EmbeddedDataField.AssignmentType<typeof Weight, Opts>

  /* ---------------------------------------- */

  export type InitializedType<Opts extends Options> = fields.EmbeddedDataField.InitializedType<typeof Weight, Opts>

  /* ---------------------------------------- */

  export type PersistedType<Opts extends Options> = fields.EmbeddedDataField.PersistedType<typeof Weight, Opts>
}

/* ---------------------------------------- */

class WeightField<
  const Options extends WeightField.Options,
  const AssignmentType = WeightField.AssignmentType<Options>,
  const InitializedType = WeightField.InitializedType<Options>,
  const PersistedType extends AnyObject | null | undefined = WeightField.PersistedType<Options>,
> extends fields.EmbeddedDataField<typeof Weight, Options, AssignmentType, InitializedType, PersistedType> {
  constructor(options?: Options, context?: fields.DataField.ConstructionContext) {
    super(Weight, options, context)
  }

  /* ---------------------------------------- */

  protected override _cast(value: unknown): AssignmentType {
    if (typeof value === 'string' || typeof value === 'number') {
      // TODO: find some way of replacing the defaultUnit value here. Probably options
      const weight = Weight.from(value, WeightUnit.Pound)

      if (weight) return weight.toObject() as AssignmentType
    }

    return super._cast(value)
  }

  /* ---------------------------------------- */

  protected override _toInput(config: fields.DataField.ToInputConfig<InitializedType>): HTMLElement | HTMLCollection {
    const stringConfig: fields.StringField.Options = { ...config }

    return foundry.applications.fields.createTextInput(stringConfig)
  }
}

/* ---------------------------------------- */

export { Weight, WeightUnit, WeightField }
