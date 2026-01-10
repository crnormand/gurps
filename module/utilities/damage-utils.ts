interface DiceData {
  dice: number
  adds: number
}

export const diceRegex = /^(?<dice>\d+)d(?<sides>\d*)((?<sign>[–\-+])(?<adds>\d+))?(?<remainder>.*)?/

/**
 *
 * @param {string} diceterm - OtF dice term, like '1d', '2d+1', etc...
 * @param {number} factor - value to multiply by
 */
export const multiplyDice = (diceterm: string, factor: number): string | undefined => {
  const match = diceterm.match(diceRegex)

  if (!match?.groups) return undefined

  const groups = match.groups
  const dice = parseInt(groups.dice) * factor
  const adds = groups.adds ? parseInt(groups.adds) * factor : ''
  const sign = groups.sign ?? ''
  const sides = groups.sides ?? ''
  let remainder = groups.remainder ?? ''

  // If there is a *Cost value, multiply it too. For example, remainder = ' burn Costs* 1FP' should become ' burn
  // Costs* 2FP'. The key value to look for is "cost*" or "costs*", case insensitive.
  if (remainder) {
    remainder = remainder.replace(
      /\s+(\*cost|\*costs)\s+(\d+)\s*(\S+)/gi,
      (_match, p1: string, p2: string, p3: string) => ` ${p1} ${parseInt(p2) * factor} ${p3}`
    )
  }

  return `${dice}d${sides}${sign}${adds}${remainder}`.trim()
}

export const isValidDiceTerm = (diceterm: string): boolean => !!diceterm.match(diceRegex)

export const addDice = (diceterm: string, addend: number): string | undefined => {
  const match = diceterm.match(diceRegex)

  if (!match?.groups) return undefined

  const groups = match.groups
  const dice = parseInt(groups.dice)
  const sign = groups.sign ?? ''

  // Convert groups.adds to a number.
  let adds = groups.adds ? parseInt(groups.adds) : 0

  // Apply the sign to the adds.
  adds = sign === '+' ? adds : -adds
  // Add the addend.
  adds += addend
  // Convert the adds back to a string.
  const addString = adds === 0 ? '' : adds < 0 ? adds : `+${adds}`

  const sides = groups.sides ?? ''
  const remainder = groups.remainder ?? ''

  return `${dice}d${sides}${addString}${remainder}`.trim()
}

export const getDiceData = (diceterm: string): DiceData | undefined => {
  const match = diceterm.match(diceRegex)

  if (!match?.groups) return undefined

  const groups = match.groups
  const dice = parseInt(groups.dice)
  let adds = groups.adds ? parseInt(groups.adds) : 0

  if (groups.sign !== '+') adds = -adds

  return { dice: dice, adds: adds }
}

/**
 * Calculate the dice roll from the rawDamage value.
 *
 * @param {Number} rawDamage
 * @returns an Object literal with two attributes: dice (integer) and adds (integer)
 */
export const getDicePlusAdds = (rawDamage: number): DiceData => {
  // If damage is less than 1d, ...
  if (rawDamage < 1) {
    // treat fractions up to 0.25 as 1d-3, ...
    if (rawDamage <= 0.25) return { dice: 1, adds: -3 }

    // fractions up to 0.5 as 1d-2, ...
    if (rawDamage <= 0.5) return { dice: 1, adds: -2 }

    // and any larger fraction as 1d-1.
    return { dice: 1, adds: -1 }
  }

  // Otherwise, round fractions of 0.5 or more up to a full die.
  let dice = Math.floor(rawDamage)

  if (rawDamage - dice >= 0.5) dice++

  return { dice: dice, adds: 0 }
}
