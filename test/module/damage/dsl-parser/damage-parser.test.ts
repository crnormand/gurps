import { DamageParser } from '@module/damage/dsl-parser/parser.js'

describe('DamageParser', () => {
  describe('parse', () => {
    test('parses direct roll with modifier and type', () => {
      const parser = new DamageParser()

      expect(parser.parse('2d+1 cut')).toEqual({
        roll: {
          accumulate: false,
          value: { kind: 'direct', dice: 2, sides: null },
          modifier: 1,
          multiplier: undefined,
          minimum: false,
          divisor: undefined,
        },
        type: 'cut',
        extendedType: undefined,
        cost: undefined,
        hitLocation: undefined,
        addMargin: false,
        canonicalModifier: '+1',
      })
    })

    test.each([
      ['sw+2 imp', 'sw' as const, 2],
      ['swing+2 imp', 'sw' as const, 2],
      ['thr-1 imp', 'thr' as const, -1],
      ['thrust-1 imp', 'thr' as const, -1],
    ])('normalizes derived aliases: %s', (input, basis, modifier) => {
      const parser = new DamageParser()
      const result = parser.parse(input)

      expect(result.roll.value).toEqual({ kind: 'derived', basis })
      expect(result.roll.modifier).toBe(modifier)
    })

    test('parses divisor and extended type', () => {
      const parser = new DamageParser()

      expect(parser.parse('2d(0.5) burn surge')).toEqual({
        roll: {
          accumulate: false,
          value: { kind: 'direct', dice: 2, sides: null },
          modifier: undefined,
          multiplier: undefined,
          minimum: false,
          divisor: 0.5,
        },
        type: 'burn',
        extendedType: 'surge',
        cost: undefined,
        hitLocation: undefined,
        addMargin: false,
        canonicalModifier: '',
      })
    })

    test.each([
      ['2d cut /2FP', '/', 2, 'FP'],
      ['2d cut / 2 FP', '/', 2, 'FP'],
      ['2d cut *costs3HP', '*costs', 3, 'HP'],
      ['2d cut *cost 3 HP', '*cost', 3, 'HP'],
      ['2d cut *per FP', '*per', undefined, 'FP'],
    ])('parses cost phrase variations: %s', (input, flag, amount, pool) => {
      const parser = new DamageParser()
      const result = parser.parse(input)

      expect(result.cost).toEqual({ flag, amount, pool })
    })

    test('parses hit location', () => {
      const parser = new DamageParser()

      expect(parser.parse('2d cut @skull').hitLocation).toBe('skull')
    })

    test('supports multiplier operators and minimum marker', () => {
      const parser = new DamageParser()

      const star = parser.parse('2d*1.5! cut')
      const x = parser.parse('2dx1.5 cut')
      const times = parser.parse('2d×1.5 cut')

      expect(star.roll.multiplier).toBe(1.5)
      expect(star.roll.minimum).toBe(true)
      expect(x.roll.multiplier).toBe(1.5)
      expect(times.roll.multiplier).toBe(1.5)
    })

    test('supports unicode minus variants for modifier sign', () => {
      const parser = new DamageParser()
      const enDash = parser.parse('2d–1 cut')
      const unicodeMinus = parser.parse('2d−1 cut')

      expect(enDash.roll.modifier).toBe(-1)
      expect(unicodeMinus.roll.modifier).toBe(-1)
    })

    test('parses scalar rolls with optional multiplier', () => {
      const parser = new DamageParser()

      expect(parser.parse('3x2 burn')).toEqual({
        roll: {
          accumulate: false,
          value: { kind: 'scalar', value: 3 },
          modifier: undefined,
          multiplier: 2,
          minimum: false,
          divisor: undefined,
        },
        type: 'burn',
        extendedType: undefined,
        cost: undefined,
        hitLocation: undefined,
        addMargin: false,
        canonicalModifier: '',
      })
    })

    test('normalizes margin found in any position', () => {
      const parser = new DamageParser()

      const left = parser.parse('+@margin 2d+1 cut')
      const right = parser.parse('2d+1 cut +@margin')

      expect(left.addMargin).toBe(true)
      expect(right.addMargin).toBe(true)
      expect(left.canonicalModifier).toBe('+1+@margin')
      expect(right.canonicalModifier).toBe('+1+@margin')
    })

    test('throws when required whitespace before type is missing', () => {
      const parser = new DamageParser()

      expect(() => parser.parse('2d+1cut')).toThrow('Expected whitespace before damage type')
    })

    test('throws for invalid divisor value', () => {
      const parser = new DamageParser()

      expect(() => parser.parse('2d(0) cut')).toThrow('Expected decimal')
    })
  })
})
