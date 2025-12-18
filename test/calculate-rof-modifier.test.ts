// @ts-ignore
import { calculateRoFModifier } from '../module/combat/utilities'

describe('calculateRoFModifier', () => {
  test.each([
    [1, 0],
    [4, 0],
    [5, 1],
    [16, 3],
    [17, 4],
    [24, 4],
    [25, 5],
    [49, 5],
    [50, 6],
    [99, 6],
    [100, 7],
    [101, 7],
    [250, 8],
    [999, 15],
  ])('rof %d => modifier %d', (rof, expected) => {
    expect(calculateRoFModifier(rof)).toBe(expected)
  })
})
