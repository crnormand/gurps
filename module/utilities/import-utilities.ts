// Example usage:
// const weapon = {
//   damage: {
//     st: 'thr',
//     base: '2',
//     type: 'cut',
//   },
// }
// console.log(buildDamageOutput(weapon)) // Output: "thr+2 cut"
// const weapon2 = {
//   damage: {
//     st: 'sw',
//     base: '-1',
//     type: 'imp',
//   },
// }
// console.log(buildDamageOutput(weapon2)) // Output: "sw-1 imp"

/**
 * Build damage output string from weapon data
 * @param {object} weapon - Weapon object with damage properties
 * @returns {string} Formatted damage string
 */
export function buildDamageOutput(weapon: Record<string, any> | null | undefined): string {
  if (!weapon?.damage?.st || !['thr', 'sw'].includes(weapon.damage.st)) return weapon?.calc?.damage || ''

  const modifier = parseInt(weapon.damage?.base || '0')

  // If modifier is NaN, fall back to calc.damage
  if (isNaN(modifier)) return weapon?.calc?.damage || ''

  const sign = modifier < 1 ? '' : '+'

  return `${weapon.damage.st}${sign}${modifier === 0 ? '' : modifier} ${weapon.damage.type}`
}

type Encumbrance = {
  level: number
  current: boolean
  key: string
  weight: string
  move: number
  dodge: number
}

/**
 * Given the basic lift, carried weight, and weight units, calculate encumbrance levels.
 * @param basicLift
 * @param carriedWeight
 * @param weightUnits
 * @param calc
 * @returns A record of encumbrance levels, with the current level marked.
 */
export function calculateEncumbranceLevels(
  basicLift: number,
  carriedWeight: number,
  weightUnits: string,
  calc: { move?: number[]; dodge?: number[] } = {}
): Record<string, Encumbrance> {
  let es: Record<string, Encumbrance> = {}
  const encumbranceLevelWeightFactors = [1, 2, 3, 6, 10]

  for (let encumbranceLevelIndex = 0; encumbranceLevelIndex <= 4; encumbranceLevelIndex++) {
    let encumbrance: Encumbrance = { level: 0, current: false, key: '', weight: '', move: 0, dodge: 0 }
    encumbrance.level = encumbranceLevelIndex
    encumbrance.current = false
    encumbrance.key = 'enc' + encumbranceLevelIndex
    let weight_value = basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex]

    // Find the highest encumbrance level whose weight_value is equal to or greater than carriedWeight.
    encumbrance.current =
      (carriedWeight < weight_value || encumbranceLevelIndex == 4 || basicLift == 0) &&
      (encumbranceLevelIndex == 0 ||
        carriedWeight > basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex - 1])

    encumbrance.weight = weight_value.toString() + ' ' + weightUnits
    encumbrance.move = calc?.move ? calc?.move[encumbranceLevelIndex] : 0
    encumbrance.dodge = calc?.dodge ? calc?.dodge[encumbranceLevelIndex] : 0
    GURPS.put(es, encumbrance, encumbranceLevelIndex)
  }
  return es
}
