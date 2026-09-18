import { _addBucketToDamage } from '@module/damage/addBucketToDamage.js'
import { describe, expect, test } from 'vitest'


describe('_addBucketToDamage', () => {
  test.each([
    ['2d+2', true, false, 3, '2d+5'],
    ['2d+2', true, false, -2, '2d'],
    ['1d-1', true, false, 2, '1d+1'],
    ['13', true, false, 2, '15'],
    ['2d+2 cut', true, false, 2, '2d+4 cut'],
    ['2d+2! (2) cut *Costs 1FP', true, false, 1, '2d+3! (2) cut *Costs 1FP'],
    ['2d+2', false, false, 3, '2d+5'],
    ['2d+2 cut', false, false, 3, '2d+5'],
    ['2d+2', true, true, 7, '4d+2'],
    ['2d+2', true, true, 4, '3d+2'],
    ['2d+2', true, true, 9, '5d'],
  ])('applies bucket modifier to %s', (formula, addDamageType, dicePlusAdds, bucketMod, expected) => {
    expect(_addBucketToDamage(formula, addDamageType, dicePlusAdds, bucketMod)).toBe(expected)
  })

  test('keeps non-dice literal damage values intact except for modifier addition', () => {
    expect(_addBucketToDamage('13', true, false, -1)).toBe('12')
    expect(_addBucketToDamage('13', false, false, 2)).toBe('15')
  })
})
