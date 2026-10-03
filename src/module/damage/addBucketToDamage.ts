import * as Settings from '@module/util/miscellaneous-settings.js'

type ParsedDamage = {
  dice?: number
  value?: number
  add: number
  damageType: string
  armorDivisor?: number
  hasMinDamage: boolean
  multiplier?: number
  costFormula?: string
  addMargin?: string
  rollFormula: string
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

export export function parseDamageFormula(formula: string): ParsedDamage | null {
  const trimmed = formula.replace('−', '-').trim()

  const costMatch = trimmed.match(/\*Costs(.+)$/)
  const costFormula = costMatch?.[1] ?? undefined
  const formulaBodyWithType = costMatch ? trimmed.slice(0, costMatch.index ?? 0).trim() : trimmed

  const damageTypeMatch = formulaBodyWithType.match(/\s+([A-Za-z][A-Za-z0-9_+-]*)\s*$/)
  const damageType = damageTypeMatch?.[1] ?? ''

  const formulaBody = damageTypeMatch ? formulaBodyWithType.slice(0, damageTypeMatch.index).trim() : formulaBodyWithType

  const hasMinDamage = formulaBody.includes('!')

  const rollFormulaRegex =
    /^(?<roll>(?<value>\d+)(?<D>d\d*)?(?<adds1>[+-](?:\d+|@?\w+))?(?<adds2>[+-](?:\d+|@?\w+))?)(?:[×xX*](?<multiplier>\d+\.?\d*))?(?: ?\((?<divisor>-?\d+(?:\.\d+)?)\))?/

  const match = formulaBody.match(rollFormulaRegex)

  if (!match || !match.groups) {
    ui.notifications?.warn(`Invalid Dice formula: "${formula}"`)

    return null
  }

  const rollFormula = match.groups.roll

  const armorDivisor = Number.parseFloat(match.groups.divisor) || undefined
  const multiplier = Number.parseFloat(match.groups.multiplier) || undefined

  const dice = match.groups.D ? Number.parseInt(match.groups.value, 10) : undefined
  const value = !match.groups.D ? Number.parseInt(match.groups.value, 10) : undefined

  const add =
    (match.groups.adds1 ? Number.parseInt(match.groups.adds1, 10) || 0 : 0) +
    (match.groups.adds2 ? Number.parseInt(match.groups.adds2, 10) || 0 : 0)

  const addMargin =
    (match.groups.adds1?.includes('@') ? match.groups.adds1 : '') +
      (match.groups.adds2?.includes('@') ? match.groups.adds2 : '') || undefined

  return {
    dice,
    value,
    add,
    damageType,
    armorDivisor,
    hasMinDamage,
    multiplier,
    costFormula,
    addMargin,
    rollFormula,
  }
}

export function addBucketToDamage(formula: string, addDamageType: boolean = true) {
  const bucketMod = GURPS.ModifierBucket.currentSum()
  const dicePlusAdds = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false

  return _addBucketToDamage(formula, addDamageType, dicePlusAdds, bucketMod)
}

export function applyDicePlusAddsToDamage(formula: string, addDamageType: boolean = true): string {
  const parsed = parseDamageFormula(formula)

  if (!parsed) return formula

  const dicePlusAdds = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) ?? false

  const newParsed = _applyDicePlusAddsToDamage(parsed, dicePlusAdds)
  const newDice = rebuildDamageFormula(newParsed, addDamageType)

  return newDice
}

function _applyDicePlusAddsToDamage(damage: ParsedDamage, dicePlusAdds: boolean): ParsedDamage {
  if (!dicePlusAdds) return damage

  let { dice, add } = damage

  if (!dice) {
    return damage
  }

  if (dicePlusAdds && dice) {
    while (add >= 7) {
      add -= 7
      dice += 2
    }

    while (add >= 4) {
      add -= 4
      dice += 1
    }
  }

  return {
    ...damage,
    dice,
    add,
  }
}

export function _addBucketToDamage(formula: string, addDamageType: boolean, dicePlusAdds: boolean, bucketMod: number) {
  const parsed = parseDamageFormula(formula)

  if (!parsed) return formula

  const { add, addMargin } = parsed
  const newAdd =
    add +
    bucketMod +
    (addMargin === '+@margin' ? (GURPS.lastTargetedRoll?.margin ?? 0) : 0) -
    (addMargin === '-@margin' ? (GURPS.lastTargetedRoll?.margin ?? 0) : 0)

  const newParsed = _applyDicePlusAddsToDamage({ ...parsed, add: newAdd }, dicePlusAdds)
  const newDice = rebuildDamageFormula(newParsed, addDamageType)

  return newDice
}

function rebuildDamageFormula(parsed: ParsedDamage, addDamageType: boolean) {
  const dice = parsed.dice ? `${parsed.dice}d` : `${(parsed.value ?? 0) + parsed.add}`
  const plus = parsed.dice && parsed.add > 0 ? '+' : ''
  const addText = parsed.dice && parsed.add !== 0 ? String(parsed.add) : ''
  const multiplierText = parsed.multiplier ? `x${parsed.multiplier}` : ''
  const minDamageText = parsed.hasMinDamage ? '!' : ''
  const armorDivisorText = parsed.armorDivisor ? `(${parsed.armorDivisor})` : ''
  const damageTypeText = addDamageType && parsed.damageType ? ` ${parsed.damageType}` : ''
  const costFormulaText = parsed.costFormula ? ` *Costs${parsed.costFormula}` : ''

  const newDice =
    `${dice}${plus}${addText}${multiplierText}${armorDivisorText}${minDamageText}${damageTypeText}${costFormulaText}`.trim()

  return newDice
}

