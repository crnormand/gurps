import { isValidDamageTerm, parseDamageTerm } from '../module/otf/damage-parser.js'

describe('damage term parser', () => {
  describe('valid terms', () => {
    test('parses a minimal damage term', () => {
      const result = parseDamageTerm('2d cut')
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        dice: 2,
        sides: null,
        modifier: null,
        multiplier: null,
        divisor: null,
        type: 'cut',
        extendedType: null,
        cost: null,
      })
      expect(isValidDamageTerm('2d cut')).toBe(true)
    })

    test('parses modifier, multiplier, divisor, and extended type', () => {
      const result = parseDamageTerm('3d6+2x1.5(5) pi++ ex')
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        dice: 3,
        sides: 6,
        modifier: 2,
        multiplier: 1.5,
        divisor: 5,
        type: 'pi++',
        extendedType: 'ex',
      })
    })

    test('parses unicode minus in modifier', () => {
      const result = parseDamageTerm('1d−1 imp')
      expect(result).not.toBeNull()
      expect(result?.modifier).toBe(-1)
      expect(result?.type).toBe('imp')
    })

    test('parses slash cost phrase with amount', () => {
      const result = parseDamageTerm('2d burn / 2FP')
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '/',
        amount: 2,
        pool: 'FP',
      })
    })

    test('parses star cost phrase with spaces', () => {
      const result = parseDamageTerm('2d tox *costs 3 HP')
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 3,
        pool: 'HP',
      })
    })

    test('parses star cost phrase with no space between amount and pool', () => {
      const result = parseDamageTerm('2d tox *costs 3HP')
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 3,
        pool: 'HP',
      })
    })

    test('parses / cost phrase without amount', () => {
      const result = parseDamageTerm('4d cr / FP')
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '/',
        amount: null,
        pool: 'FP',
      })
    })
  })

  describe('invalid terms', () => {
    test('rejects missing damage type', () => {
      expect(parseDamageTerm('2d')).toBeNull()
      expect(isValidDamageTerm('2d')).toBe(false)
    })

    test('rejects unknown damage type', () => {
      expect(parseDamageTerm('2d fire')).toBeNull()
    })

    test('rejects invalid modifier', () => {
      expect(parseDamageTerm('2d+ cut')).toBeNull()
    })

    test('rejects invalid divisor decimal', () => {
      expect(parseDamageTerm('2d(0.5) cut')).toBeNull()
    })

    test('rejects incomplete cost phrase', () => {
      expect(parseDamageTerm('2d cut *costs')).toBeNull()
      expect(parseDamageTerm('2d cut /')).toBeNull()
    })

    test('rejects cost phrase without required space after cost flag', () => {
      expect(parseDamageTerm('2d burn /2FP')).toBeNull()
      expect(parseDamageTerm('2d tox *costs3HP')).toBeNull()
    })
  })
})
