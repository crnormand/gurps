import * as Settings from '@module/util/miscellaneous-settings.js'

/**
 * Recalculate the formula based on Modifier Bucket total.
 *
 * Formula examples: 2d+2, 1d-1, 3d6, 1d-2. (Must also handle literal damage, such as '13').
 * Can use the optional rule (B269) to round damage: +7 points = +2d and +4 points = +1d
 *
 * Examples:
 * * with armor divisor: 2d+2 (2)
 * * with damage type: 2d+2 cut
 * * with cost formula: 2d+2 (0.5) cut *Costs 1FP
 * * with armor divisor and damage type: 2d+2(2) cut
 * * with multiplier: 2d*2
 * * with minimum damage: 2d+2!
 * * Everything: 4d+2! (2) cut *Costs 1FP
 *
 */
export function addBucketToDamage(formula: string, addDamageType: boolean = true) {
  const bucketMod = GURPS.ModifierBucket.currentSum()
  const dicePlusAdds = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false
 
  return _addBucketToDamage(formula, addDamageType, dicePlusAdds, bucketMod)
}

export function _addBucketToDamage(formula: string, addDamageType: boolean, dicePlusAdds: boolean, bucketMod: number) {
  let dice = undefined
  let value = undefined

  if (formula.match(/^(?<dice>\d+)d/)) {
    dice = parseInt(formula.match(/^(?<dice>\d+)d/)?.groups?.dice ?? '')
  } else if (formula.match(/^(?<number>\d+)/)) {
    value = parseInt(formula.match(/^(?<number>\d+)/)?.groups?.number ?? '')
  }

  const add = parseInt(formula.match(/([+-]\d+)/)?.[1] ?? '0')
  const damageType = formula.match(/\s(\w+)/)?.[1] ?? ''

  const armorDivisor = formula.match(/(?<=\()\S+(?=\))/)?.[0]
  const hasMinDamage = formula.includes('!')
  const multiplier = formula.match(/(?<=[xX*])\d+(\.\d+)?/)?.[0] || ''
  const costFormula = formula.match(/(?<=\*)\D.+/)?.[0] || ''

  let newAdd = add + bucketMod

  if (!dice && value) {
    return `${value + newAdd} ${addDamageType ? damageType : ''}`.trim()
  }

  if (dicePlusAdds && dice) {
    while (newAdd >= 7) {
      newAdd -= 7
      dice += 2
    }

    while (newAdd >= 4) {
      newAdd -= 4
      dice += 1
    }
  }

  const plus = newAdd > 0 ? '+' : ''
  const addText = newAdd !== 0 ? newAdd : ''
  const minDamageText = hasMinDamage ? '! ' : ''
  const armorDivisorText = armorDivisor ? `(${armorDivisor})` : ''
  const damageTypeText = addDamageType ? ` ${damageType}` : ''
  const costFormulaText = costFormula ? ` *${costFormula}` : ''
  const multiplierText = multiplier ? `*${multiplier}` : ''
  const newDice =
    `${dice}d${plus}${addText}${multiplierText}${minDamageText}${armorDivisorText}${damageTypeText}${costFormulaText}`.trim()

  console.debug(`addBucketToDamage: ${formula} => ${newDice}`)

  return newDice
}
