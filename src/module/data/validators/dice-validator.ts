export const DICE_PATTERN = /^(?<number>\d+)d(?<sides>\d+)?(?<modifier>[+\-\u2010\u2013\u2212]\d+)?$/i

// TODO: Consider using this function everywhere we need to validate a dice string.
//
// Validate a dice string in the format of "XdY+Z" where X is the number of dice, Y is the number of sides, and Z is an
// optional modifier. 'X' is required and must be a positive integer, 'Y' is optional and defaults to 6 if not provided,
// and 'Z' is optional and can be either positive or negative.
export function validateDice(dice: string, _options = {}): boolean | void {
  if (typeof dice !== 'string') {
    console.warn(`Expected a string for dice validation, but received: ${typeof dice}`)

    return false
  }

  const match = dice.match(DICE_PATTERN)

  if (!match) {
    console.warn(`Dice string "${dice}" does not match the expected pattern.`)

    return false
  }

  if (match.groups!.sides && parseInt(match.groups!.sides) <= 0) {
    console.warn(`Dice string "${dice}" has invalid sides value: ${match.groups!.sides}`)

    return false
  }

  if (match.groups!.number && parseInt(match.groups!.number) <= 0) {
    console.warn(`Dice string "${dice}" has invalid number of dice: ${match.groups!.number}`)

    return false
  }

  return true
}
