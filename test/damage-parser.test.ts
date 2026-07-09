import { DAMAGE_TYPES, DamageTermParser } from '../module/damage/damage-parser.ts'

const baseDamageTerm = {
  accumulator: false,
  dice: null,
  usesD: false,
  sides: null,
  derivedRoll: null,
  bang: false,
  modifier: 0,
  multiplier: null,
  divisor: null,
  type: '',
  extendedType: null,
  cost: null,
  hitLocation: null,
}

describe('damage term parser', () => {
  let input: string

  beforeEach(() => {
    input = expect.getState().currentTestName!.split('#> ')[1]
  })

  describe('valid terms', () => {
    test.each(DAMAGE_TYPES)('#> 2d %s', damageType => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.type).toBe(damageType)
      expect(DamageTermParser.isValid(input)).toBe(true)
    })

    test('#> 2d cut', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        accumulator: false,
        dice: 2,
        usesD: true,
        type: 'cut',
      })
      expect(DamageTermParser.isValid(input)).toBe(true)
    })

    test('#> 2d fire', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 2,
        usesD: true,
        type: 'fire',
        extendedType: null,
      })
      expect(DamageTermParser.isValid(input)).toBe(true)
    })

    test('#> 2d burn explosive', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 2,
        usesD: true,
        type: 'burn',
        extendedType: 'explosive',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d burn explosive')
    })

    test('#> +2d cut', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        accumulator: true,
        dice: 2,
        usesD: true,
        type: 'cut',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('+2d cut')
    })

    test('#> 12 pi++', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 12,
        type: 'pi++',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('12 pi++')
    })

    test.each([
      ['sw+1 cut', 'sw', false, 'sw+1 cut', 1, false, 'cut'],
      ['swing-2 imp', 'sw', false, 'sw-2 imp', -2, false, 'imp'],
      ['thr+3 pi-', 'thr', false, 'thr+3 pi-', 3, false, 'pi-'],
      ['thrust+1 cr', 'thr', false, 'thr+1 cr', 1, false, 'cr'],
      ['SWING-2 imp', 'sw', false, 'sw-2 imp', -2, false, 'imp'],
      ['SW+1 cut', 'sw', false, 'sw+1 cut', 1, false, 'cut'],
      ['THRUST+1 cr', 'thr', false, 'thr+1 cr', 1, false, 'cr'],
      ['THR+3 pi-', 'thr', false, 'thr+3 pi-', 3, false, 'pi-'],
      ['+sw+1 cut', 'sw', false, '+sw+1 cut', 1, true, 'cut'],
      ['+swing cut', 'sw', false, '+sw cut', 0, true, 'cut'],
      ['sw+1! cut', 'sw', true, 'sw+1! cut', 1, false, 'cut'],
    ])(
      '#> %s',
      (
        input,
        expectedDerivedRoll,
        expectedBang,
        expectedCanonical,
        expectedModifier,
        expectedAcccumulator,
        expectedType
      ) => {
        const result = DamageTermParser.parse(input)
        expect(result).not.toBeNull()
        expect(result).toMatchObject({
          ...baseDamageTerm,
          derivedRoll: expectedDerivedRoll,
          bang: expectedBang,
          modifier: expectedModifier,
          accumulator: expectedAcccumulator,
          type: expectedType,
        })

        const parser = new DamageTermParser(input)
        expect(parser.toCanonicalString()).toBe(expectedCanonical)
      }
    )

    test.each([
      ['+1', 1, '2d+1 cut'],
      ['-1', -1, '2d-1 cut'],
      ['–1', -1, '2d-1 cut'],
      ['−1', -1, '2d-1 cut'],
    ])('#> 2d%s cut', (_modifier, expected, expectedCanonical) => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.modifier).toBe(expected)
      expect(DamageTermParser.isValid(input)).toBe(true)

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe(expectedCanonical)
    })

    test.each([
      ['*2', 2, '2d+1×2 cut'],
      ['x2', 2, '2d+1×2 cut'],
      ['X2', 2, '2d+1×2 cut'],
      ['×2', 2, '2d+1×2 cut'],
      ['x1.5', 1.5, '2d+1×1.5 cut'],
      ['*0.5', 0.5, '2d+1×0.5 cut'],
    ])('#> 2d+1%s cut', (_multiplier, expected, expectedCanonical) => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.multiplier).toBe(expected)
      expect(DamageTermParser.isValid(input)).toBe(true)

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe(expectedCanonical)
    })

    test('#> 3d+2x5(5) pi++ ex', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 3,
        usesD: true,
        modifier: 2,
        multiplier: 5,
        divisor: 5,
        type: 'pi++',
        extendedType: 'ex',
      })
    })

    test('#> 2d(0.5) cut', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 2,
        usesD: true,
        bang: false,
        divisor: 0.5,
        type: 'cut',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d(0.5) cut')
    })

    test('#> 2d+1! cut', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result).toMatchObject({
        ...baseDamageTerm,
        dice: 2,
        usesD: true,
        modifier: 1,
        bang: true,
        type: 'cut',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d+1! cut')
    })

    test('#> 1d−1 imp', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.modifier).toBe(-1)
      expect(result?.type).toBe('imp')
    })

    test('#> 2d burn / 2FP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*per',
        amount: 2,
        pool: 'FP',
      })
    })

    test('#> 2d burn *cost 2 FP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 2,
        pool: 'FP',
      })

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d burn *costs 2 FP')
    })

    test('#> 2d tox *costs 3 HP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 3,
        pool: 'HP',
      })
    })

    test('#> 2d tox *costs 3HP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 3,
        pool: 'HP',
      })
    })

    test('#> 4d cr / FP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*per',
        amount: 1,
        pool: 'FP',
      })
    })

    test('#> 2d cut @torso', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.hitLocation).toBe('torso')

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d cut @torso')
    })

    test('#> 2d burn / 2 FP @arm', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*per',
        amount: 2,
        pool: 'FP',
      })
      expect(result?.hitLocation).toBe('arm')

      const parser = new DamageTermParser(input)
      expect(parser.toCanonicalString()).toBe('2d burn *per 2 FP @arm')
    })

    test('#> 2d tox *costs HP', () => {
      const result = DamageTermParser.parse(input)
      expect(result).not.toBeNull()
      expect(result?.cost).toEqual({
        flag: '*costs',
        amount: 1,
        pool: 'HP',
      })
    })
  })

  describe('invalid terms', () => {
    test('#> 2d', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
      expect(DamageTermParser.isValid(input)).toBe(false)
    })

    test('#> 2d+ cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 3d6 cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 12+1 cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 12! cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> +12 cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 12(2) cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d cut *costs', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d cut /', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d burn /2FP', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d cut @', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d tox *costs3HP', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d+1*0. cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d(0.) cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d+1*0 cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d(0) cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })

    test('#> 2d!! cut', () => {
      expect(DamageTermParser.parse(input)).toBeNull()
    })
  })

  describe('instance methods', () => {
    test('#> 2d cut', () => {
      const parser = new DamageTermParser(input)

      expect(parser.isValid()).toBe(true)
      expect(parser.output).not.toBeNull()
      expect(parser.toCanonicalString()).toBe('2d cut')
    })

    test('#> 2d fire', () => {
      const parser = new DamageTermParser(input)

      expect(parser.isValid()).toBe(true)
      expect(parser.output).not.toBeNull()
      expect(parser.toCanonicalString()).toBe('2d fire')
    })

    test('#> 3d+2x5(5) pi++ ex *costs 3 HP', () => {
      const parser = new DamageTermParser(input)

      expect(parser.parse()).not.toBeNull()
      expect(parser.toCanonicalString()).toBe('3d+2×5(5) pi++ ex *costs 3 HP')
    })

    test('#> 2d+1 cut', () => {
      const parser = new DamageTermParser(input)

      const first = parser.parse()
      const second = parser.parse()

      expect(first).not.toBeNull()
      expect(second).toBe(first)
      expect(parser.toCanonicalString()).toBe('2d+1 cut')
    })

    test('#> 2d+1! cut', () => {
      const parser = new DamageTermParser(input)

      expect(parser.parse()).not.toBeNull()
      expect(parser.output?.bang).toBe(true)
      expect(parser.toCanonicalString()).toBe('2d+1! cut')
    })
  })
})
