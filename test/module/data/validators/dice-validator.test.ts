import { validateDice } from '@module/data/validators/dice-validator.js'

describe('validateDice', () => {
  test.each([['2d6+1'], ['2d6-1'], ['2d6‐1'], ['2d6–1'], ['2d6−1']])('accepts valid modifier signs: %s', dice => {
    expect(validateDice(dice)).toBe(true)
  })

  test.each([['2d'], ['2d+1'], ['2d-1'], ['2d‐1'], ['2d–1'], ['2d−1']])(
    'accepts dice expressions without sides value: %s',
    dice => {
      expect(validateDice(dice)).toBe(true)
    }
  )

  test.each([['d'], ['d+1'], ['d-1'], ['0d'], ['2d+'], ['2d-'], ['2d+-1'], ['2d--1']])(
    'rejects malformed dice expressions without sides value: %s',
    dice => {
      expect(validateDice(dice)).toBe(false)
    }
  )

  test.each([['2d0'], ['2d00'], ['2da'], ['2dX'], ['2d6.5'], ['2d6a']])(
    'rejects dice expressions with zero or non-numeric sides: %s',
    dice => {
      expect(validateDice(dice)).toBe(false)
    }
  )

  test.each([['2d6+'], ['2d6-'], ['2d6++1'], ['2d6--1'], ['2d6+-1'], ['2d6+1.5'], ['2d6+a'], ['2d6+foo']])(
    'rejects dice expressions with malformed modifiers: %s',
    dice => {
      expect(validateDice(dice)).toBe(false)
    }
  )

  test.each([[undefined], [null], [0], [1], [true], [false], [{}], [[]]])('rejects non-string input: %p', value => {
    expect(validateDice(value as never)).toBe(false)
  })
})
