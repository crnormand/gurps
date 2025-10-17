export const diceRegex = /^(?<dice>\d+)d(?<sides>\d*)((?<sign>[\–\-+])(?<adds>\d+))?(?<remainder>.*)?/

/**
 *
 * @param {string} diceterm - OtF dice term, like '1d', '2d+1', etc...
 * @param {number} factor - value to multiply by
 */
export function multiplyDice(diceterm, factor) {
  if (diceterm.match(diceRegex)) {
    let groups = diceterm.match(diceRegex).groups
    let dice = parseInt(groups.dice) * factor
    let adds = groups.adds ? parseInt(groups.adds) * factor : ''
    let sign = groups.sign ?? ''
    let sides = groups.sides ?? ''
    let remainder = groups.remainder ?? ''

    // If there is a *Cost value, multiply it too. For example, remainder = ' burn Costs* 1FP' should become ' burn
    // Costs* 2FP'. The key value to look for is "cost*" or "costs*", case insensitive.
    if (remainder) {
      remainder = remainder.replace(
        /\s+(\*cost|\*costs)\s+(\d+)\s*(\S+)/gi,
        (match, p1, p2, p3) => ` ${p1} ${parseInt(p2) * factor} ${p3}`
      )
    }

    return `${dice}d${sides}${sign}${adds}${remainder}`.trim()
  }
}

export function isValidDiceTerm(diceterm) {
  return !!diceterm.match(diceRegex)
}

export function addDice(diceterm, addend) {
  if (diceterm.match(diceRegex)) {
    let groups = diceterm.match(diceRegex).groups
    let dice = parseInt(groups.dice)
    let sign = groups.sign ?? ''

    // Convert groups.adds to a number.
    let adds = groups.adds ? parseInt(groups.adds) : 0
    // Apply the sign to the adds.
    adds = sign === '+' ? adds : -adds
    // Add the addend.
    adds += addend
    // Convert the adds back to a string.
    let addString = adds === 0 ? '' : adds < 0 ? adds : `+${adds}`

    let sides = groups.sides ?? ''
    let remainder = groups.remainder ?? ''
    return `${dice}d${sides}${addString}${remainder}`.trim()
  }
}

export function getDiceData(diceterm) {
  if (diceterm.match(diceRegex)) {
    let groups = diceterm.match(diceRegex).groups
    let dice = parseInt(groups.dice)
    let adds = groups.adds ? parseInt(groups.adds) : 0
    if (groups.sign !== '+') adds = -adds
    return { dice: dice, adds: adds }
  }
}

/**
 * Calculate the dice roll from the rawDamage value.
 *
 * @param {Number} rawDamage
 * @returns an Object literal with two attributes: dice (integer) and adds (integer)
 */
export function getDicePlusAdds(rawDamage) {
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
