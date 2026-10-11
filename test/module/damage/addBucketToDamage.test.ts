import { _addBucketToDamage, addBucketToDamage, parseDamageFormula } from '@module/damage/addBucketToDamage.js'
import { SETTING_MODIFY_DICE_PLUS_ADDS } from '@module/util/miscellaneous-settings.js'
import { describe, expect, test, vi } from 'vitest'

describe('parseDamageFormula', () => {
  const warn = vi.fn()

  beforeEach(() => {
    warn.mockReset()
    ;(globalThis as any).ui = { notifications: { warn } }
    ;(globalThis as any).GURPS = {
      lastTargetedRoll: { margin: 4 },
    }
  })

  test.each([
    [
      '2d+2 cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: undefined,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '2d−2 cut',
      {
        dice: 2,
        value: undefined,
        add: -2,
        damageType: 'cut',
        armorDivisor: undefined,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '2d+2x3(2) cut *Costs 1FP',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 3,
        costFormula: ' 1FP',
      },
    ],
    [
      '3d+2x4(2) cut',
      {
        dice: 3,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 4,
        costFormula: undefined,
      },
    ],
    [
      '2d+2*3(2) cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 3,
        costFormula: undefined,
      },
    ],
    [
      '2d+2×3(2) cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 3,
        costFormula: undefined,
      },
    ],
    [
      '2d+2×3 (2) cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 3,
        costFormula: undefined,
      },
    ],
    [
      '2d+2*3 (2) cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: 3,
        costFormula: undefined,
      },
    ],
    [
      '2d+2*0.5 (0.5) cut',
      {
        dice: 2,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 0.5,
        hasMinDamage: false,
        multiplier: 0.5,
        costFormula: undefined,
      },
    ],
    [
      '4d+2 (2)! cut',
      {
        dice: 4,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: true,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '4d+2(2) cut',
      {
        dice: 4,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 2,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '4d+2(0.5) cut',
      {
        dice: 4,
        value: undefined,
        add: 2,
        damageType: 'cut',
        armorDivisor: 0.5,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '13',
      {
        dice: undefined,
        value: 13,
        add: 0,
        damageType: '',
        armorDivisor: undefined,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '1d+1+2 cut',
      {
        dice: 1,
        value: undefined,
        add: 3,
        damageType: 'cut',
        armorDivisor: undefined,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
      },
    ],
    [
      '1d+@margin cut',
      {
        dice: 1,
        value: undefined,
        add: 0,
        damageType: 'cut',
        armorDivisor: undefined,
        hasMinDamage: false,
        multiplier: undefined,
        costFormula: undefined,
        addMargin: '+@margin',
      },
    ],
  ])('parses %s', (formula, expected) => {
    expect(parseDamageFormula(formula)).toMatchObject(expected)
  })
})

describe('_addBucketToDamage', () => {
  beforeEach(() => {
    ;(globalThis as any).GURPS = {
      lastTargetedRoll: { margin: 4 },
    }
  })

  test.each([
    ['2d+2', true, false, 3, '2d+5'],
    ['2d+2', true, false, -2, '2d'],
    ['1d-1', true, false, 2, '1d+1'],
    ['1d-2', true, false, 1, '1d-1'],
    ['13', true, false, 2, '15'],
    ['2d+2 cut', true, false, 2, '2d+4 cut'],
    ['2d+2(2) cut', true, false, 3, '2d+5(2) cut'],
    ['2dx2', true, false, 3, '2d+3x2'],
    ['2dX2', true, false, 3, '2d+3x2'],
    ['2d*2', true, false, 3, '2d+3x2'],
    ['2d*2 *Costs 1FP', true, false, 3, '2d+3x2 *Costs 1FP'],
    ['2d*2 *Costs 1FP', true, false, 3, '2d+3x2 *Costs 1FP'],
    ['3d+2x4(2)', true, false, 1, '3d+3x4(2)'],
    ['2d+2 cut *Costs 1FP', false, false, 2, '2d+4 *Costs 1FP'],
    ['2d+2 (2)! cut *Costs 1FP', true, false, 1, '2d+3(2)! cut *Costs 1FP'],
    ['2d+2', false, false, 3, '2d+5'],
    ['2d+2 cut', false, false, 3, '2d+5'],
    ['2d+2', true, true, 7, '4d+2'],
    ['2d+2', true, true, 4, '3d+2'],
    ['2d+2', true, true, 9, '5d'],
    [' 2d+2 cut *Costs 1FP', true, true, 1, '2d+3 cut *Costs 1FP'],
    ['2d+2 pi++', true, true, 1, '2d+3 pi++'],
    ['2d+2 pi+', true, true, 1, '2d+3 pi+'],
    ['2d+@margin pi+', true, false, 1, '2d+5 pi+'],
  ])('applies bucket modifier to %s', (formula, addDamageType, dicePlusAdds, bucketMod, expected) => {
    expect(_addBucketToDamage(formula, addDamageType, dicePlusAdds, bucketMod)).toBe(expected)
  })

  test('keeps non-dice literal damage values intact except for modifier addition', () => {
    expect(_addBucketToDamage('13', true, false, -1)).toBe('12')
    expect(_addBucketToDamage('13', false, false, 2)).toBe('15')
  })
})

describe('addBucketToDamage', () => {
  test.each([
    [false, 4, '2d+6'],
    [false, 7, '2d+9'],
    [true, 4, '3d+2'],
    [true, 7, '4d+2'],
  ])('uses modify-dice-plus-adds=%s for bucket modifier %i', (modifyDicePlusAdds, bucketMod, expected) => {
    const getSetting = vi.fn().mockReturnValue(modifyDicePlusAdds)

    ;(globalThis as any).GURPS = {
      SYSTEM_NAME: 'gurps',
      ModifierBucket: { currentSum: vi.fn().mockReturnValue(bucketMod) },
      lastTargetedRoll: { margin: 4 },
    }
    ;(globalThis as any).game = {
      settings: { get: getSetting },
    }

    expect(addBucketToDamage('2d+2')).toBe(expected)
    expect(getSetting).toHaveBeenCalledWith('gurps', SETTING_MODIFY_DICE_PLUS_ADDS)
  })
})
