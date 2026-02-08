import { convertRangeTextToArray } from '@module/util/text-utilties.ts'

describe('convertRangeTextToArray', () => {
  test('parses a single inclusive range', () => {
    expect(convertRangeTextToArray('2-5')).toEqual([2, 3, 4, 5])
    expect(convertRangeTextToArray('1-1')).toEqual([1])
  })

  test('parses multiple comma-separated ranges', () => {
    expect(convertRangeTextToArray('1-3,5-6')).toEqual([1, 2, 3, 5, 6])
  })

  test('trims whitespace around ranges', () => {
    expect(convertRangeTextToArray(' 4-4 , 7-8 ')).toEqual([4, 7, 8])
  })

  test('ignores invalid tokens', () => {
    expect(convertRangeTextToArray('a-b, 2-x')).toEqual([])
    expect(convertRangeTextToArray('-')).toEqual([])
  })

  test('returns empty for reversed ranges (start > end)', () => {
    expect(convertRangeTextToArray('5-3')).toEqual([])
  })

  test('returns single number for single numbers (current behavior)', () => {
    expect(convertRangeTextToArray('5')).toEqual([5])
    expect(convertRangeTextToArray('5, 2-3')).toEqual([2, 3, 5])
  })

  test('returns empty for empty input', () => {
    expect(convertRangeTextToArray('')).toEqual([])
  })

  test('handles spaces around hyphen', () => {
    expect(convertRangeTextToArray('1 - 3')).toEqual([1, 2, 3])
  })

  test('allows overlapping ranges (removes duplicates, current behavior)', () => {
    expect(convertRangeTextToArray('1-3,2-4')).toEqual([1, 2, 3, 4])
  })
})
