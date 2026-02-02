import { GcsDice } from '../../lib/gcs/dice.js'

/**
 * Build damage output string from weapon data
 * @param {object} weapon - Weapon object with damage properties
 * @returns {string} Formatted damage string
 */
export function buildDamageOutputGCS(
  weapon: Record<string, any> | null | undefined,
  attributes?: Record<string, any> | null | undefined
): string {
  if (!game.settings!.get(GURPS.SYSTEM_NAME, 'auto-update-strength')) {
    return weapon?.calc?.damage || ''
  }

  if (!weapon?.damage?.st || !['thr', 'sw'].includes(weapon.damage.st)) return weapon?.calc?.damage || ''

  if (!!attributes && !!attributes.thrust && !!attributes.swing) {
    const damage = weapon?.calc?.damage.replace(weapon.damage.type, '').trim()

    const calcDamage = GcsDice.fromString(damage || '')
    const modifier = parseInt(weapon.damage?.base || '0')
    const thrustDamage = GcsDice.fromString(attributes.thrust)
    const swingDamage = GcsDice.fromString(attributes.swing)
    const weaponDamage = weapon.damage.st === 'thr' ? thrustDamage.add(modifier) : swingDamage.add(modifier)

    // This is the bonus to add to derived damage to make it equal weaponDamage.
    const diff = calcDamage.difference(weaponDamage)
    const finalModifier = modifier + diff
    const sign = finalModifier <= 0 ? '' : '+'
    return `${weapon.damage.st}${sign}${finalModifier === 0 ? '' : finalModifier} ${weapon.damage.type}`
  }

  const modifier = parseInt(weapon.damage?.base || '0')
  if (isNaN(modifier)) return weapon?.calc?.damage || ''
  const sign = modifier <= 0 ? '' : '+'

  return `${weapon.damage.st}${sign}${modifier === 0 ? '' : modifier} ${weapon.damage.type}`
}

type XmlTextLike = { ['#text']?: string } | string | number | null | undefined

export const readXmlText = (value: XmlTextLike): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (typeof value === 'object' && value['#text']) return String(value['#text']).trim()
  return ''
}

/**
 * Build damage output string from GCA melee mode data
 * @param {object} mode - GCA melee mode object
 * @returns {string} Formatted damage string
 */
export function buildDamageOutputGCA(mode: Record<string, any> | null | undefined): string {
  if (!mode) return ''

  if (!game.settings!.get(GURPS.SYSTEM_NAME, 'auto-update-strength')) {
    return readXmlText(mode.damage)
  }

  const direct = readXmlText(mode.unmodifiedDamage)
  if (direct.toLowerCase().match(/^(sw|thr)[ +-]/)) return direct

  return readXmlText(mode.damage)
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
    let encumbrance: Encumbrance = {
      level: encumbranceLevelIndex,
      current: false,
      key: 'enc' + encumbranceLevelIndex,
      weight: '',
      move: calc?.move ? calc?.move[encumbranceLevelIndex] : 0,
      dodge: calc?.dodge ? calc?.dodge[encumbranceLevelIndex] : 0,
    }

    let weightValue = basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex]

    // Find the highest encumbrance level whose weightValue is equal to or greater than carriedWeight.
    encumbrance.current =
      (carriedWeight < weightValue || encumbranceLevelIndex === 4 || basicLift === 0) &&
      (encumbranceLevelIndex === 0 ||
        carriedWeight > basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex - 1])

    encumbrance.weight = weightValue.toString() + ' ' + weightUnits
    GURPS.put(es, encumbrance, encumbranceLevelIndex)
  }
  return es
}
