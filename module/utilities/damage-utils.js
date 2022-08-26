/**
 *
 * @param {string} diceterm - OtF dice term, like '1d', '2d+1', etc...
 * @param {number} factor - value to multiply by
 */
export function multiplyDice(diceterm, factor) {
  const regex = /^(?<dice>\d+)d(?<sides>\d*)((?<sign>[\–\-+])(?<adds>\d+))?(?<remainder>.*)?/
  if (diceterm.match(regex)) {
    let groups = diceterm.match(regex).groups
    let dice = parseInt(groups.dice) * factor
    let adds = groups.adds ? parseInt(groups.adds) * factor : ''
    let sign = groups.sign ?? ''
    let sides = groups.sides ?? ''
    let remainder = groups.remainder ?? ''
    return `${dice}d${sides}${sign}${adds}${remainder}`.trim()
  }
}
