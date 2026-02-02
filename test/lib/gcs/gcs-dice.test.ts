import { GcsDice } from '../../../lib/gcs/dice.ts'

describe('GcsDice', () => {
  describe('normalizeDamage', () => {
    it.each([
      // 1d with low modifiers stays the same (modifier < 3 when count == 1)
      { input: { count: 1, modifier: -2 }, expected: { count: 1, modifier: -2 }, description: '1d-2 stays 1d-2' },
      { input: { count: 1, modifier: -1 }, expected: { count: 1, modifier: -1 }, description: '1d-1 stays 1d-1' },
      { input: { count: 1, modifier: 0 }, expected: { count: 1, modifier: 0 }, description: '1d stays 1d' },
      { input: { count: 1, modifier: 1 }, expected: { count: 1, modifier: 1 }, description: '1d+1 stays 1d+1' },
      { input: { count: 1, modifier: 2 }, expected: { count: 1, modifier: 2 }, description: '1d+2 stays 1d+2' },

      // 1d with modifier >= 3 gets normalized
      { input: { count: 1, modifier: 3 }, expected: { count: 2, modifier: -1 }, description: '1d+3 becomes 2d-1' },
      { input: { count: 1, modifier: 4 }, expected: { count: 2, modifier: 0 }, description: '1d+4 becomes 2d' },
      { input: { count: 1, modifier: 5 }, expected: { count: 2, modifier: 1 }, description: '1d+5 becomes 2d+1' },
      { input: { count: 1, modifier: 6 }, expected: { count: 2, modifier: 2 }, description: '1d+6 becomes 2d+2' },
      { input: { count: 1, modifier: 7 }, expected: { count: 3, modifier: -1 }, description: '1d+7 becomes 3d-1' },
      { input: { count: 1, modifier: 8 }, expected: { count: 3, modifier: 0 }, description: '1d+8 becomes 3d' },

      // Multiple dice with negative modifiers
      { input: { count: 2, modifier: -2 }, expected: { count: 1, modifier: 2 }, description: '2d-2 becomes 1d+2' },
      { input: { count: 2, modifier: -3 }, expected: { count: 1, modifier: 1 }, description: '2d-3 becomes 1d+1' },
      { input: { count: 2, modifier: -4 }, expected: { count: 1, modifier: 0 }, description: '2d-4 becomes 1d' },
      { input: { count: 2, modifier: -5 }, expected: { count: 1, modifier: -1 }, description: '2d-5 becomes 1d-1' },
      { input: { count: 2, modifier: -1 }, expected: { count: 2, modifier: -1 }, description: '2d-1 stays 2d-1' },

      // Multiple dice with positive modifiers
      { input: { count: 2, modifier: 0 }, expected: { count: 2, modifier: 0 }, description: '2d stays 2d' },
      { input: { count: 2, modifier: 1 }, expected: { count: 2, modifier: 1 }, description: '2d+1 stays 2d+1' },
      { input: { count: 2, modifier: 2 }, expected: { count: 2, modifier: 2 }, description: '2d+2 stays 2d+2' },
      { input: { count: 2, modifier: 3 }, expected: { count: 3, modifier: -1 }, description: '2d+3 becomes 3d-1' },
      { input: { count: 2, modifier: 4 }, expected: { count: 3, modifier: 0 }, description: '2d+4 becomes 3d' },
      { input: { count: 2, modifier: 5 }, expected: { count: 3, modifier: 1 }, description: '2d+5 becomes 3d+1' },
      { input: { count: 2, modifier: 8 }, expected: { count: 4, modifier: 0 }, description: '2d+8 becomes 4d' },

      // Higher dice counts
      { input: { count: 3, modifier: 4 }, expected: { count: 4, modifier: 0 }, description: '3d+4 becomes 4d' },
      { input: { count: 5, modifier: -6 }, expected: { count: 3, modifier: 2 }, description: '5d-6 becomes 3d+2' },
      { input: { count: 10, modifier: 10 }, expected: { count: 12, modifier: 2 }, description: '10d+10 becomes 12d+2' },
    ])('$description', ({ input, expected }) => {
      const damage = new GcsDice(input.count, input.modifier)
      const result = GcsDice.normalizeDamage(damage)
      expect(result.count).toBe(expected.count)
      expect(result.modifier).toBe(expected.modifier)
    })
  })

  describe('toString', () => {
    it.each([
      { count: 1, modifier: 0, expected: '1d' },
      { count: 1, modifier: 1, expected: '1d+1' },
      { count: 1, modifier: -1, expected: '1d-1' },
      { count: 2, modifier: 2, expected: '2d+2' },
      { count: 3, modifier: -2, expected: '3d-2' },
      { count: 5, modifier: 0, expected: '5d' },
    ])('should format $count dice with modifier $modifier as "$expected"', ({ count, modifier, expected }) => {
      const dice = new GcsDice(count, modifier)
      expect(dice.toString()).toBe(expected)
    })
  })
})
