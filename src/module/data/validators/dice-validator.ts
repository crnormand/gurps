export const DICE_PATTERN = /^(?<number>\d*)d(?<sides>\d+)?(?<modifier>[+-]\d+)?$/i

// Validate a dice string in the format of "XdY+Z" where X is the number of dice, Y is the number of sides, and Z is an
// optional modifier. 'X' is required and must be a positive integer, 'Y' is optional and defaults to 6 if not provided,
// and 'Z' is optional and can be either positive or negative.
export function validateDice(dice: string, _options = {}): boolean | void {
  if (typeof dice !== 'string') {
    return false
  }

  const match = dice.match(DICE_PATTERN)

  if (!match) {
    return false
  }

  if (match.groups!.sides && parseInt(match.groups!.sides) <= 0) {
    return false
  }

  if (match.groups!.number && parseInt(match.groups!.number) <= 0) {
    return false
  }

  if (match.groups!.modifier && !/^[+-]\d+$/.test(match.groups!.modifier)) {
    return false
  }

  return true
}
