import { numberValidate } from '@module/data/validators/number-validator.js'

describe('isValidNumberValue', () => {
  test.each([[7], ['7'], [' 7 '], ['3.14'], [-3], ['-3']])('accepts finite numbers and numeric strings: %p', value => {
    expect(numberValidate(value)).toBe(true)
  })

  test.each([[''], ['   '], ['foo'], [Infinity], ['Infinity'], [NaN], [null], [undefined], [true], [{}], [[]]])(
    'rejects non-finite or non-numeric values: %p',
    value => {
      expect(numberValidate(value as never)).toBe(false)
    }
  )

  test.each([[7], ['7'], [' 7 '], [-3], ['-3']])('enforces integerOnly option: %p', value => {
    expect(numberValidate(value, { integerOnly: true })).toBe(true)
  })

  test.each([[3.14], ['3.14']])('rejects non-integers when integerOnly is true: %p', value => {
    expect(numberValidate(value, { integerOnly: true })).toBe(false)
  })

  test.each([[0], ['0'], [7], ['7']])('enforces nonnegative option: %p', value => {
    expect(numberValidate(value, { nonnegative: true })).toBe(true)
  })

  test.each([[-1], ['-1']])('rejects negatives when nonnegative is true: %p', value => {
    expect(numberValidate(value, { nonnegative: true })).toBe(false)
  })

  test.each([[7], ['7'], [-3], ['-3']])('enforces nonzero option: %p', value => {
    expect(numberValidate(value, { nonzero: true })).toBe(true)
  })

  test.each([[0], ['0'], ['0.0']])('rejects zero when nonzero is true: %p', value => {
    expect(numberValidate(value, { nonzero: true })).toBe(false)
  })

  test.each([[7], ['7']])('supports combined options: %p', value => {
    expect(numberValidate(value, { integerOnly: true, nonnegative: true, nonzero: true })).toBe(true)
  })

  test.each([[0], ['0'], [3.14], ['3.14'], [-1], ['-1']])('rejects violations for combined options: %p', value => {
    expect(numberValidate(value, { integerOnly: true, nonnegative: true, nonzero: true })).toBe(false)
  })
})
