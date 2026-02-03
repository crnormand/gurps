import { GcsDice } from '../lib/gcs/dice.ts'

describe('GcsDice', () => {
  describe('constructor', () => {
    it('should create a dice with default parameters', () => {
      const dice = new GcsDice(2, 3)
      expect(dice.count).toBe(2)
      expect(dice.modifier).toBe(3)
      expect(dice.multiplier).toBe(1)
      expect(dice.sides).toBe(6)
    })

    it('should create a dice with custom multiplier and sides', () => {
      const dice = new GcsDice(3, 1, 2, 8)
      expect(dice.count).toBe(3)
      expect(dice.modifier).toBe(1)
      expect(dice.multiplier).toBe(2)
      expect(dice.sides).toBe(8)
    })
  })

  describe('fromString', () => {
    it('should parse simple dice notation', () => {
      const dice = GcsDice.fromString('2d')
      expect(dice.count).toBe(2)
      expect(dice.modifier).toBe(0)
    })

    it('should parse dice notation with positive modifier', () => {
      const dice = GcsDice.fromString('3d+2')
      expect(dice.count).toBe(3)
      expect(dice.modifier).toBe(2)
    })

    it('should parse dice notation with negative modifier', () => {
      const dice = GcsDice.fromString('2d-1')
      expect(dice.count).toBe(2)
      expect(dice.modifier).toBe(-1)
    })

    it('should parse dice notation with en dash', () => {
      const dice = GcsDice.fromString('2d–3')
      expect(dice.count).toBe(2)
      expect(dice.modifier).toBe(-3)
    })

    it('should throw error for invalid dice notation', () => {
      expect(() => GcsDice.fromString('invalid')).toThrow('Invalid dice string: invalid')
      expect(() => GcsDice.fromString('d2')).toThrow('Invalid dice string: d2')
      expect(() => GcsDice.fromString('2d+a')).toThrow('Invalid dice string: 2d+a')
    })
  })

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

  describe('minus', () => {
    it('should calculate difference between same count dice', () => {
      const dice1 = new GcsDice(2, 3)
      const dice2 = new GcsDice(2, 1)
      expect(dice1.difference(dice2)).toBe(2)
    })

    it('should normalize count when other has higher count', () => {
      const dice1 = new GcsDice(1, 0)
      const dice2 = new GcsDice(2, 0)
      // dice2 normalized to 1d: 2d0 -> 1d+4
      expect(dice1.difference(dice2)).toBe(-4)
    })

    it('should normalize count when other has lower count', () => {
      const dice1 = new GcsDice(2, 0)
      const dice2 = new GcsDice(1, 0)
      // dice2 normalized to 2d: 1d0 -> 2d-4
      expect(dice1.difference(dice2)).toBe(4)
    })

    it('should handle negative modifiers', () => {
      const dice1 = new GcsDice(2, -1)
      const dice2 = new GcsDice(2, -3)
      expect(dice1.difference(dice2)).toBe(2) // -3 - (-1) = -2
    })
  })

  describe('normalizeCount', () => {
    it('should return other unchanged when counts are equal', () => {
      const dice = new GcsDice(2, 0)
      const result = dice.normalizeCount(new GcsDice(2, 3))
      expect(result.count).toBe(2)
      expect(result.modifier).toBe(3)
    })

    it('should convert higher count to lower count', () => {
      const dice = new GcsDice(1, 0)
      const result = dice.normalizeCount(new GcsDice(3, 0))
      expect(result.count).toBe(1)
      expect(result.modifier).toBe(8) // 0 + 4 + 4
    })

    it('should convert lower count to higher count', () => {
      const dice = new GcsDice(3, 0)
      const result = dice.normalizeCount(new GcsDice(1, 0))
      expect(result.count).toBe(3)
      expect(result.modifier).toBe(-8) // 0 - 4 - 4
    })

    it('should preserve existing modifier', () => {
      const dice = new GcsDice(2, 0)
      const result = dice.normalizeCount(new GcsDice(1, 2))
      expect(result.count).toBe(2)
      expect(result.modifier).toBe(-2) // 2 - 4
    })

    it('should handle multiple normalizations', () => {
      const dice = new GcsDice(4, 0)
      const result = dice.normalizeCount(new GcsDice(1, 1))
      expect(result.count).toBe(4)
      expect(result.modifier).toBe(-11) // 1 - 4 - 4 - 4
    })
  })
})
