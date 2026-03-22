import { diceNormalize, diceParse, diceValidate } from '@module/data/validators/dice-validator.js'

describe('validateDice', () => {
  test.each([['2d6+1'], ['2d6-1'], ['2d6‐1'], ['2d6–1'], ['2d6−1']])('accepts valid modifier signs: %s', dice => {
    expect(diceValidate(dice)).toBe(true)
  })

  test.each([['1d4'], ['2d8+1'], ['3d10-2'], ['4d12✕2'], ['5d20−1']])('accepts non-d6 dice expressions: %s', dice => {
    expect(diceValidate(dice)).toBe(true)
  })

  test.each([['2d'], ['2d+1'], ['2d-1'], ['2d‐1'], ['2d–1'], ['2d−1']])(
    'accepts dice expressions without sides value: %s',
    dice => {
      expect(diceValidate(dice)).toBe(true)
    }
  )

  test.each([['d'], ['d+1'], ['d-1'], ['0d'], ['2d+'], ['2d-'], ['2d+-1'], ['2d--1']])(
    'rejects malformed dice expressions without sides value: %s',
    dice => {
      expect(diceValidate(dice)).toBe(false)
    }
  )

  test.each([['2d0'], ['2d00'], ['2da'], ['2dX'], ['2d6.5'], ['2d6a']])(
    'rejects dice expressions with zero or non-numeric sides: %s',
    dice => {
      expect(diceValidate(dice)).toBe(false)
    }
  )

  test.each([
    ['2D6'],
    [' 2d6 '],
    ['2d6 +1'],
    ['2d6 -1'],
    ['2d6 x2'],
    ['2d6 X2'],
    ['2d6 ✕2'],
    ['2d6+1 x2'],
    ['2d6-1X2'],
    ['2d6−1✕2'],
    ['2d x2'],
    ['2d   +1   X2'],
  ])('accepts dice expressions matching optional whitespace and multiplier branches: %s', dice => {
    expect(diceValidate(dice)).toBe(true)
  })

  test.each([['2d6+'], ['2d6-'], ['2d6++1'], ['2d6--1'], ['2d6+-1'], ['2d6+1.5'], ['2d6+a'], ['2d6+foo']])(
    'rejects dice expressions with malformed modifiers: %s',
    dice => {
      expect(diceValidate(dice)).toBe(false)
    }
  )

  test.each([
    ['2 d6'],
    ['2d 6'],
    ['2d6+ 1'],
    ['2d6- 1'],
    ['2d6x'],
    ['2d6X'],
    ['2d6✕'],
    ['2d6xx2'],
    ['2d6x2.5'],
    ['2d6x-2'],
  ])('rejects dice expressions with malformed spacing or multiplier: %s', dice => {
    expect(diceValidate(dice)).toBe(false)
  })

  test.each([[undefined], [null], [0], [1], [true], [false], [{}], [[]]])('rejects non-string input: %p', value => {
    expect(diceValidate(value as never)).toBe(false)
  })
})

describe('diceParse', () => {
  test.each([
    ['2d', { count: 2, sides: 6, modifier: 0, multiplier: 1 }],
    ['2d+1', { count: 2, sides: 6, modifier: 1, multiplier: 1 }],
    ['2d-1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d‐1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d–1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d−1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2D6', { count: 2, sides: 6, modifier: 0, multiplier: 1 }],
    [' 2d6 ', { count: 2, sides: 6, modifier: 0, multiplier: 1 }],
    ['2d6+1', { count: 2, sides: 6, modifier: 1, multiplier: 1 }],
    ['2d6-1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d6‐1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d6–1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d6−1', { count: 2, sides: 6, modifier: -1, multiplier: 1 }],
    ['2d x2', { count: 2, sides: 6, modifier: 0, multiplier: 2 }],
    ['2d+1 x2', { count: 2, sides: 6, modifier: 1, multiplier: 2 }],
    ['2d−1✕2', { count: 2, sides: 6, modifier: -1, multiplier: 2 }],
    ['2d6 x2', { count: 2, sides: 6, modifier: 0, multiplier: 2 }],
    ['2d6 X2', { count: 2, sides: 6, modifier: 0, multiplier: 2 }],
    ['2d6 ✕2', { count: 2, sides: 6, modifier: 0, multiplier: 2 }],
    ['2d6+1 x2', { count: 2, sides: 6, modifier: 1, multiplier: 2 }],
    ['2d6−1✕2', { count: 2, sides: 6, modifier: -1, multiplier: 2 }],
    ['1d4', { count: 1, sides: 4, modifier: 0, multiplier: 1 }],
    ['2d8+1', { count: 2, sides: 8, modifier: 1, multiplier: 1 }],
    ['3d10-2', { count: 3, sides: 10, modifier: -2, multiplier: 1 }],
    ['4d12✕2', { count: 4, sides: 12, modifier: 0, multiplier: 2 }],
    ['5d20−1', { count: 5, sides: 20, modifier: -1, multiplier: 1 }],
  ])('parses valid dice expressions: %s', (dice, expected) => {
    expect(diceParse(dice)).toEqual(expected)
  })

  test.each([['d'], ['d+1'], ['0d'], ['0d6'], ['2d0'], ['2d00'], ['2d6+'], ['2d6x'], ['2d6x-2'], ['2d6+ 1'], ['2 d6']])(
    'returns null for malformed dice expressions: %s',
    dice => {
      expect(diceParse(dice)).toBeNull()
    }
  )

  test.each([[undefined], [null], [0], [1], [true], [false], [{}], [[]]])(
    'returns null for non-string input: %p',
    value => {
      expect(diceParse(value as never)).toBeNull()
    }
  )
})

describe('diceNormalize', () => {
  test.each([
    ['2d', '2d'],
    ['2D6', '2d'],
    [' 2d6 ', '2d'],
    ['02d06', '2d'],
    ['2d6+1', '2d+1'],
    ['2d6 +1', '2d+1'],
    ['2d6-1', '2d-1'],
    ['2d6‐1', '2d-1'],
    ['2d6–1', '2d-1'],
    ['2d6−1', '2d-1'],
    ['2d x2', '2d✕2'],
    ['2d6 x2', '2d✕2'],
    ['2d6 X2', '2d✕2'],
    ['2d6 ✕2', '2d✕2'],
    ['2d6+1 x2', '2d+1✕2'],
    ['2d6−1✕2', '2d-1✕2'],
    ['2d   +1   X2', '2d+1✕2'],
    ['1d4', '1d4'],
    ['2d8+1', '2d8+1'],
    ['3d10-2', '3d10-2'],
    ['4d12 x2', '4d12✕2'],
    ['5d20−1', '5d20-1'],
  ])('normalizes valid dice expressions: %s', (dice, expected) => {
    expect(diceNormalize(dice)).toBe(expected)
  })

  test.each([['d'], ['d+1'], ['0d'], ['0d6'], ['2d0'], ['2d00'], ['2d6+'], ['2d6x'], ['2d6x-2'], ['2d6+ 1'], ['2 d6']])(
    'returns null for malformed dice expressions: %s',
    dice => {
      expect(diceNormalize(dice)).toBeNull()
    }
  )

  test.each([[undefined], [null], [0], [1], [true], [false], [{}], [[]]])(
    'returns null for non-string input: %p',
    value => {
      expect(diceNormalize(value as never)).toBeNull()
    }
  )

  test.each([
    ['2d', '2d6'],
    ['2D6', '2d6'],
    [' 2d6 ', '2d6'],
    ['02d06', '2d6'],
    ['2d6+1', '2d6+1'],
    ['2d6 +1', '2d6+1'],
    ['2d6-1', '2d6-1'],
    ['2d6‐1', '2d6-1'],
    ['2d6–1', '2d6-1'],
    ['2d6−1', '2d6-1'],
    ['2d x2', '2d6✕2'],
    ['2d6 x2', '2d6✕2'],
    ['2d6 X2', '2d6✕2'],
    ['2d6 ✕2', '2d6✕2'],
    ['2d6+1 x2', '2d6+1✕2'],
    ['2d6−1✕2', '2d6-1✕2'],
    ['2d   +1   X2', '2d6+1✕2'],
    ['1d4', '1d4'],
    ['2d8+1', '2d8+1'],
    ['3d10-2', '3d10-2'],
    ['4d12 x2', '4d12✕2'],
    ['5d20−1', '5d20-1'],
  ])('normalizes valid dice expressions with explicit d6 when useGurpsFormat is false: %s', (dice, expected) => {
    expect(diceNormalize(dice, false)).toBe(expected)
  })
})
