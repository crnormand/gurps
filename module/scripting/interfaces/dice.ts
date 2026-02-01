interface Dice {
  count: number
  sides: number
  modifier: number
  multiplier: number
}

const DICE_RE = /^\s*(?<count>\d+)?\s*(?<d>[dD])?\s*(?<sides>\d+)?\s*(?<mod>[+-]\s*\d+)?\s*(?<mult>[xX]\s*\d+)?\s*$/

/* ---------------------------------------- */

function from(count: number, sides?: number, modifier?: number, multiplier?: number): string {
  const result: Dice = { count: 0, sides: 0, modifier: 0, multiplier: 1 }

  // Account for the dice(sides) shorthand
  if (count && sides === undefined && modifier === undefined && multiplier === undefined) {
    sides = count
    count = 1
  }

  if (sides === undefined) return ''

  result.sides = sides
  if (count !== undefined) result.count = count
  else result.count = 1

  if (modifier !== undefined) result.modifier = modifier

  if (multiplier !== undefined) result.multiplier = multiplier
  else result.multiplier = 1

  return diceToString(result)
}

/* ---------------------------------------- */

function normalize(dice: Dice): void {
  if (dice.count < 0) dice.count = 0
  if (dice.sides < 0) dice.sides = 0
  if (dice.multiplier < 1) dice.multiplier = 1
}

/* ---------------------------------------- */

export function randInt(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('min/max must be finite')
  min = Math.ceil(min)
  max = Math.floor(max)
  if (max < min) throw new Error('max must be >= min')

  return Math.floor(Math.random() * (max - min + 1)) + min
}
/* ---------------------------------------- */

function getAdjustedCountAndModifier(dice: Dice, applyExtraDiceFromModifiers: boolean): [number, number] {
  normalize(dice)

  if (dice.sides == 0) return [dice.count, dice.modifier]

  let count = dice.count
  let modifier = dice.modifier

  if (applyExtraDiceFromModifiers && modifier > 0) {
    const average = (dice.sides + 1) / 2

    if (dice.sides % 2 === 1) {
      // Odd number of sides, so average is a whole number

      count += modifier / average
      modifier %= average
    } else {
      // Eeven number of sides, so average has an extra half, which means we alternate

      while (modifier > average) {
        if (modifier > 2 * average) {
          modifier -= 2 * average + 1
          count += 2
        } else {
          modifier -= average + 1
          count += 1
        }
      }
    }
  }

  if (count < 0) count = 0

  return [count, modifier]
}

/* ---------------------------------------- */

export function fromString(spec: string): Dice {
  const m = spec.match(DICE_RE)

  if (!m?.groups) throw new Error(`Invalid dice spec: ${spec}`)
  const { count, d, sides, mod, mult } = m.groups
  const hasCount = !!count
  const hasD = !!d
  const hasSides = !!sides

  const dice: Dice = {
    count: hasCount ? parseInt(count!, 10) : 0,
    sides: hasSides ? parseInt(sides!, 10) : 0,
    modifier: 0,
    multiplier: 1,
  }
  // defaults around `d`

  if (hasD) {
    if (hasSides && !hasCount)
      dice.count = 1 // "d6" => 1d6
    else if (!hasSides && hasCount) dice.sides = 6 // "2d" => 2d6
  }

  // +/- modifier
  if (mod) dice.modifier += parseInt(mod.replace(/\s+/g, ''), 10)

  // if no "d", treat as flat number
  if (!hasD) {
    dice.modifier += dice.count
    dice.count = 0
    dice.sides = 0
  }

  // x multiplier
  if (mult) {
    const n = parseInt(mult.replace(/\s+/g, '').slice(1), 10)

    dice.multiplier = n || 1
  }

  normalize(dice)

  return dice
}

/* ---------------------------------------- */

function diceToString(dice: Dice, GURPSFormat = true): string {
  let result = ''

  if (dice.count > 0) {
    if (GURPSFormat || dice.count > 1) result += dice.count.toString()
    result += 'd'
    if (!GURPSFormat || dice.sides !== 6) result += dice.sides.toString()
  }

  if (dice.modifier > 0) {
    if (dice.count !== 0 && dice.sides !== 0) result += '+'
    result += `${dice.modifier}`
  } else if (dice.modifier < 0) {
    result += `${dice.modifier}`
  }

  if (result === '') result = '0'

  if (dice.multiplier !== 1) {
    result += 'x' + dice.multiplier.toString()
  }

  return result
}

/* ---------------------------------------- */

function flattenMultiplier(d: Dice): Dice {
  normalize(d)

  if (d.multiplier !== 1) {
    d.count *= d.multiplier
    d.modifier *= d.multiplier
    d.multiplier = 1
  }

  return d
}

function isPureModifier(d: Dice): boolean {
  return d.count === 0 && d.sides === 0
}

export function addDiceSpecsStrict(left: string, right: string): string {
  const d1 = flattenMultiplier(fromString(left))
  const d2 = flattenMultiplier(fromString(right))

  if (d1.sides !== d2.sides) throw new Error('dice sides must match')
  d1.count += d2.count
  d1.modifier += d2.modifier

  normalize(d1)

  return diceToString(d1)
}

export function subtractDiceSpecsStrict(left: string, right: string): string {
  const d1 = flattenMultiplier(fromString(left))
  const d2 = flattenMultiplier(fromString(right))

  if (d1.sides !== d2.sides) throw new Error('dice sides must match')
  d1.count = Math.max(d1.count - d2.count, 0)
  d1.modifier -= d2.modifier

  normalize(d1)

  return diceToString(d1)
}

/* ---------------------------------------- */

function add(left: string, right: string): string {
  const d1 = flattenMultiplier(fromString(left))
  const d2 = flattenMultiplier(fromString(right))

  if (d1.sides !== d2.sides) {
    if (isPureModifier(d2)) {
      d1.modifier += d2.modifier

      normalize(d1)

      return diceToString(d1)
    }

    if (isPureModifier(d1)) {
      d2.modifier += d1.modifier

      normalize(d2)

      return diceToString(d2)
    }

    throw new Error('dice sides must match')
  }

  d1.count += d2.count
  d1.modifier += d2.modifier

  normalize(d1)

  return diceToString(d1)
}

/* ---------------------------------------- */

function subtract(left: string, right: string): string {
  const d1 = flattenMultiplier(fromString(left))
  const d2 = flattenMultiplier(fromString(right))

  if (d1.sides !== d2.sides) {
    if (isPureModifier(d2)) {
      d1.modifier -= d2.modifier

      normalize(d1)

      return diceToString(d1)
    }

    throw new Error('dice sides must match')
  }

  d1.count = Math.max(d1.count - d2.count, 0)
  d1.modifier -= d2.modifier

  normalize(d1)

  return diceToString(d1)
}

/* ---------------------------------------- */

export const count = (spec: string) => fromString(spec).count
export const sides = (spec: string) => fromString(spec).sides
export const modifier = (spec: string) => fromString(spec).modifier
export const multiplier = (spec: string) => fromString(spec).multiplier

export function roll(spec: string, extraDiceFromModifiers: boolean): number {
  const dice = fromString(spec)

  let count = 0
  let result = 0

  ;[count, result] = getAdjustedCountAndModifier(fromString(spec), extraDiceFromModifiers)

  if (dice.sides > 1) {
    for (let i = 0; i < count; i++) {
      result += 1 + randInt(0, dice.sides)
    }
  } else if (dice.sides === 1) {
    result = count
  }

  return result * dice.multiplier
}

/* ---------------------------------------- */

export const ScriptDice = {
  add,
  count,
  from,
  modifier,
  multiplier,
  roll,
  sides,
  subtract,
}
