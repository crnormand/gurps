/**
 * The modifier pattern is signed, where the sign may be one of the following: +, - (ASCII hyphen-minus), – (en dash), − (unicode minus), or ‐ (unicode hyphen).
 */
export const DICE_PATTERN =
  /^\s*(?<count>\d+)(?<d>[dD])(?<sides>\d+)?\s*(?<mod>[+\-\u2010\u2013\u2212]\d+)?\s*(?<mult>[✕xX]\s*\d+)?\s*$/

export type DiceData = {
  count: number
  sides: number
  modifier: number
  multiplier: number
}

// TODO: Consider using this function everywhere we need to validate a dice string.

// TODO: Decide if we will persist all variations of the modifier sign or if we will normalize them to a single character.

/**
 * Validate a dice string in the format of "XdY+Z✕A" where X is the number of dice, Y is the number of sides, and Z is
 * an optional modifier and A is an optional multiplier. 'X' is required and must be a positive integer, 'Y' is
 * optional and must be a positive integer if provided, and 'Z' is optional and can be either positive or negative.
 */
export function diceValidate(dice: string, _options = {}): boolean | void {
  if (typeof dice !== 'string') {
    return false
  }

  const normalizedDice = dice.trim()
  const match = normalizedDice.match(DICE_PATTERN)

  if (!match) {
    return false
  }

  if (match.groups!.count && parseInt(match.groups!.count) <= 0) {
    return false
  }

  if (match.groups!.sides && parseInt(match.groups!.sides) <= 0) {
    return false
  }

  return true
}

/**
 * Parse a dice string in the format of "XdY+Z✕A" where X is the number of dice, Y is the number of sides, and Z is
 * an optional modifier and A is an optional multiplier. 'X' is required and must be a positive integer, 'Y' is
 * optional and must be a positive integer if provided, and 'Z' is optional and can be either positive or negative.
 *
 * @param dice
 * @returns {DiceData | null} An object containing the count, sides, modifier, and multiplier if the input is valid, or
 *   null if the input is invalid.
 */
export function diceParse(dice: string): DiceData | null {
  if (typeof dice !== 'string') {
    return null
  }

  const normalizedDice = dice.trim()
  const match = normalizedDice.match(DICE_PATTERN)

  if (!match) {
    return null
  }

  const count = match.groups!.count ? parseInt(match.groups!.count) : 1
  const sides = match.groups!.sides ? parseInt(match.groups!.sides) : 6

  if (count <= 0 || sides <= 0) {
    return null
  }

  const modifier = match.groups!.mod
    ? parseInt(match.groups!.mod.replace(/[\u2010\u2013\u2212]/g, '-').replace(/\s+/g, ''))
    : 0
  const multiplier = match.groups!.mult ? parseInt(match.groups!.mult.replace(/^[✕xX]\s*/, '')) : 1

  return { count, sides, modifier, multiplier }
}

/**
 * Normalize a dice string by parsing it and then reformatting it in a consistent way. The normalized format will be
 * "XdY+Z✕A" where X is the number of dice, Y is the number of sides, Z is the modifier (if any), and A is the
 * multiplier (if any). Modifiers will be normalized to use lowercase 'd', '+' for positive values and '-' for negative
 * values, and multipliers will be normalized to use '✕'.
 *
 * @param dice
 * @returns {string | null} A normalized dice string if the input is valid, or null if the input is invalid.
 */
export function diceNormalize(dice: string, useGurpsFormat = true): string | null {
  const parsedDice = diceParse(dice)

  if (!parsedDice) {
    return null
  }

  const modifier =
    parsedDice.modifier > 0 ? `+${parsedDice.modifier}` : parsedDice.modifier < 0 ? `${parsedDice.modifier}` : ''
  const multiplier = parsedDice.multiplier !== 1 ? `✕${parsedDice.multiplier}` : ''

  const sides = useGurpsFormat && parsedDice.sides === 6 ? '' : parsedDice.sides

  return `${parsedDice.count}d${sides}${modifier}${multiplier}`
}
