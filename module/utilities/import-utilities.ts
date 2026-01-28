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
