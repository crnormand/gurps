import DataModel = foundry.abstract.DataModel
import fields = foundry.data.fields

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

const lengthSchema = () => {
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

type WeightSchema = ReturnType<typeof lengthSchema>

/* ---------------------------------------- */

class Weight<Parent extends DataModel.Any | null = DataModel.Any | null> extends DataModel<WeightSchema, Parent> {
  /* ---------------------------------------- */
  /*  Static Properties                       */
  /* ---------------------------------------- */

  static Unit = WeightUnit

  /* ---------------------------------------- */

  static INCHES_PER_MILE = 63360
  /* ---------------------------------------- */

  // Maximum number of decimal places to display
  static ROUNDING_PRECISION = 4

  /* ---------------------------------------- */

  static UNIT_LABELS: Record<WeightUnit, string[]> = {
    [Weight.Unit.Pound]: ['lb', 'pound', 'pounds'],
    [Weight.Unit.PoundAlt]: ['#'],
    [Weight.Unit.Ounce]: ['oz', 'ounce', 'ounces'],
    [Weight.Unit.Ton]: ['tn', 'ton', 'tons'],
    [Weight.Unit.TonAlt]: ['t'],
    [Weight.Unit.Kilogram]: ['kg', 'kilogram', 'kilograms'],
    [Weight.Unit.Gram]: ['g', 'gram', 'grams'],
  }

  /* ---------------------------------------- */

  // Everything is relative to the inch, using GURPS simplified lengths only
  static UNIT_CONVERSIONS: Record<WeightUnit, number> = {
    [Weight.Unit.Pound]: 1,
    [Weight.Unit.PoundAlt]: 1,
    [Weight.Unit.Ounce]: 1 / 16,
    [Weight.Unit.Ton]: 2000,
    [Weight.Unit.TonAlt]: 2000,
    [Weight.Unit.Kilogram]: 2,
    [Weight.Unit.Gram]: 2 / 1000,
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
    return lengthSchema()
  }

  /* ---------------------------------------- */

  /**
   * If forced is true, return 0 if the string is empty or invalid
   */
  static from(value: unknown, defaultUnits: WeightUnit): Weight | null
  static from(value: unknown, defaultUnits: WeightUnit, forced: false): Weight | null
  static from(value: unknown, defaultUnits: WeightUnit, forced: true): Weight
  static from(value: unknown, defaultUnits: WeightUnit, forced: boolean): Weight | null

  static from(value: unknown, unit: WeightUnit, forced: boolean = false): Weight | null {
    function returnNull() {
      if (forced) return new Weight({ value: 0, unit: Weight.Unit.Pound })
      console.error('Invalid length value', value)
      return null
    }

    if (typeof value === 'number') {
      // When no unit is specified, always assume the value is in inches
      return Weight.fromString(`${value}`, Weight.Unit.Pound, forced)
    } else if (typeof value === 'string') {
      return Weight.fromString(value, unit, forced)
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
      console.error('Invalid length string', text)
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

export { Weight }
