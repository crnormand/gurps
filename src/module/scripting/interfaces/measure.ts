import { Length, LengthUnit } from '../../data/common/length.ts'
import { Weight, WeightUnit } from '../../data/common/weight.ts'

function verifyLengthUnit(unit: string): unit is LengthUnit {
  return Object.values(Length.Unit).includes(unit as LengthUnit)
}

/* ---------------------------------------- */

function verifyWeightUnit(unit: string): unit is WeightUnit {
  return Object.values(Weight.Unit).includes(unit as WeightUnit)
}

/* ---------------------------------------- */

function formatLength(inches: number, toUnits: string): string {
  if (!verifyLengthUnit(toUnits)) throw new Error(`Unsupported length units: ${toUnits}`)

  const length = Length.fromInches(inches).to(toUnits)

  return length.toString()
}

/* ---------------------------------------- */

function lengthToInches(value: number, fromUnits: string): number {
  if (!verifyLengthUnit(fromUnits)) throw new Error(`Unsupported length units: ${fromUnits}`)

  return new Length({ value, unit: fromUnits }).to(Length.Unit.Inch).value
}

/* ---------------------------------------- */

function formatWeight(pounds: number, toUnits: string): string {
  if (!verifyWeightUnit(toUnits)) throw new Error(`Unsupported weight units: ${toUnits}`)

  const weight = Weight.fromPounds(pounds).to(toUnits)

  return weight.toString()
}

/* ---------------------------------------- */

function weightToPounds(value: number, fromUnits: string): number {
  if (!verifyWeightUnit(fromUnits)) throw new Error(`Unsupported weight units: ${fromUnits}`)

  return new Weight({ value, unit: fromUnits }).to(Weight.Unit.Pound).value
}

/* ---------------------------------------- */

function stringWeightToPounds(str: string, defaultUnits: string): number {
  if (!verifyWeightUnit(defaultUnits)) throw new Error(`Unsupported weight units: ${defaultUnits}`)

  const weight = Weight.fromString(str, defaultUnits as WeightUnit, true)

  return weight.to(Weight.Unit.Pound).value
}

/* ---------------------------------------- */

function ssrtInchesToValue(inches: number, allowNegative: boolean): number {
  let yards = inches / 36

  if (allowNegative) {
    switch (true) {
      case inches <= 1 / 5:
        return -15
      case inches <= 1 / 3:
        return -14
      case inches <= 1 / 2:
        return -13
      case inches <= 2 / 3:
        return -12
      case inches <= 1:
        return -11
      case inches <= 1.5:
        return -10
      case inches <= 2:
        return -9
      case inches <= 3:
        return -8
      case inches <= 5:
        return -7
      case inches <= 8:
        return -6
    }
  }

  const feet = inches / 12

  switch (true) {
    case feet <= 1:
      return -5
    case feet <= 1.5:
      return -4
    case yards <= 1:
      return -2
    case yards <= 1.5:
      return -1
  }

  if (yards <= 2) return 0

  let amount = 0

  while (yards > 10) {
    yards /= 10
    amount += 6
  }

  switch (true) {
    case yards > 7:
      return amount + 4
    case yards > 5:
      return amount + 3
    case yards > 3:
      return amount + 2
    case yards > 2:
      return amount + 1
    case yards > 1.5:
      return amount
    default:
      return amount - 1
  }
}

/* ---------------------------------------- */

function ssrtToYards(value: number): number {
  if (value < -15) value = -15

  switch (value) {
    case -15:
      return 1 / 5 / 36
    case -14:
      return 1 / 3 / 36
    case -13:
      return 1 / 2 / 36
    case -12:
      return 2 / 3 / 36
    case -11:
      return 1 / 36
    case -10:
      return 1.5 / 36
    case -9:
      return 2 / 36
    case -8:
      return 3 / 36
    case -7:
      return 5 / 36
    case -6:
      return 8 / 36
    case -5:
      return 1 / 12
    case -4:
      return 1.5 / 12
    case -2:
      return 1
    case -1:
      return 1.5
    case 0:
      return 2
    case 1:
      return 3
    case 2:
      return 5
    case 3:
      return 7
  }

  value -= 4
  let multiplier = 1

  for (let i = 0; i < value / 6; i++) {
    multiplier *= 10
  }

  let valueYards = 0

  switch (value % 6) {
    case 0:
      valueYards = 10
      break
    case 1:
      valueYards = 7
      break
    case 2:
      valueYards = 5
      break
    case 3:
      valueYards = 3
      break
    case 4:
      valueYards = 2
      break
    case 5:
      valueYards = 1.5
      break
  }

  return valueYards * multiplier
}

/* ---------------------------------------- */

function rangeModifier(yards: number): number {
  return -ssrtInchesToValue(yards * 36, false)
}

/* ---------------------------------------- */

function sizeModifier(yards: number): number {
  return ssrtInchesToValue(yards * 36, true)
}

/* ---------------------------------------- */

function modifier(length: number, units: string, forSize: boolean): number {
  return forSize ? sizeModifier(lengthToInches(length, units)) : rangeModifier(lengthToInches(length, units))
}

/* ---------------------------------------- */

function modifierToYards(modifier: number): number {
  return ssrtToYards(modifier)
}

/* ---------------------------------------- */

export const ScriptMeasure = Object.freeze({
  formatLength,
  lengthToInches,
  formatWeight,
  weightToPounds,
  stringWeightToPounds,
  rangeModifier,
  sizeModifier,
  modifier,
  modifierToYards,
})
