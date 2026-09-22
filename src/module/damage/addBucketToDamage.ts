import * as Settings from '@module/util/miscellaneous-settings.js'

type ParsedDamage = {
  dice?: number
  value?: number
  add: number
  damageType: string
  armorDivisor?: string
  hasMinDamage: boolean
  multiplier?: string
  costFormula?: string
}

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

function parseDamageFormula(formula: string): ParsedDamage {
  const trimmed = formula.trim()

  const costMatch = trimmed.match(/\*Costs(.+)$/)
  const costFormula = costMatch?.[1] ?? undefined
  const formulaBody = costMatch ? formula.slice(0, costMatch.index ?? 0).trim() : trimmed

  const damageTypeMatch = formulaBody.match(/\s+([A-Za-z][A-Za-z0-9_-]*)\s*$/)
  const damageType = damageTypeMatch?.[1] ?? ''

  const armorDivisor = formulaBody.match(/\(([^)]+)\)/)?.[1] ?? undefined
  const hasMinDamage = formulaBody.includes('!')
  const multiplier = formulaBody.match(/(?:[xX*])(\d+(?:\.\d+)?)/)?.[1] ?? undefined

  const diceMatch = formulaBody.match(/^(\d+)d/i)
  const literalMatch = formulaBody.match(/^(\d+)(?!d)/)

  const dice = diceMatch ? Number.parseInt(diceMatch[1], 10) : undefined
  const value = !diceMatch && literalMatch ? Number.parseInt(literalMatch[1], 10) : undefined

  const addMatch = formulaBody.match(/([+-]\d+)/)
  const add = addMatch ? Number.parseInt(addMatch[1], 10) : 0

  return {
    dice,
    value,
    add,
    damageType,
    armorDivisor,
    hasMinDamage,
    multiplier,
    costFormula,
  }
}

export function addBucketToDamage(formula: string, addDamageType: boolean = true) {
  const bucketMod = GURPS.ModifierBucket.currentSum()
  const dicePlusAdds = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false

  return _addBucketToDamage(formula, addDamageType, dicePlusAdds, bucketMod)
}

export function _addBucketToDamage(formula: string, addDamageType: boolean, dicePlusAdds: boolean, bucketMod: number) {
  const parsed = parseDamageFormula(formula)
  const { value, add } = parsed
  let newAdd = add + bucketMod

  if (value !== undefined) {
    return `${value + newAdd} ${addDamageType ? parsed.damageType : ''}`.trim()
  }

  let { dice } = parsed

  if (!dice) {
    return formula
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
  const addText = newAdd !== 0 ? String(newAdd) : ''
  const multiplierText = parsed.multiplier ? `x${parsed.multiplier}` : ''
  const minDamageText = parsed.hasMinDamage ? '! ' : ''
  const armorDivisorText = parsed.armorDivisor ? `(${parsed.armorDivisor})` : ''
  const damageTypeText = addDamageType && parsed.damageType ? ` ${parsed.damageType}` : ''
  const costFormulaText = parsed.costFormula ? ` *Costs${parsed.costFormula}` : ''

  const newDice =
    `${dice}d${plus}${addText}${multiplierText}${minDamageText}${armorDivisorText}${damageTypeText}${costFormulaText}`.trim()

  return newDice
}
