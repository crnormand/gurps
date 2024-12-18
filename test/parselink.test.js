import { parseForRollOrDamage } from '../lib/parselink'
import { DamageTable } from '../module/damage/damage-tables'

globalThis.GURPS = {}
globalThis.game = {
  i18n: {
    localize: str => str,
  },
}

describe('parseForRollOrDamage', () => {
  beforeAll(() => {
    GURPS.DamageTables = new DamageTable()
  })

  test('1d6+2 cr', () => {
    const result = parseForRollOrDamage('1d6+2 cr')

    expect(result.action).toEqual({
      orig: '1d6+2 cr',
      type: 'damage',
      formula: '1d6+2',
      damagetype: 'cr',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('1d-2! cr', () => {
    const result = parseForRollOrDamage('1d-2! cr')

    expect(result.action).toEqual({
      orig: '1d-2! cr',
      type: 'damage',
      formula: '1d-2!',
      damagetype: 'cr',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('12 pi++', () => {
    const result = parseForRollOrDamage('12 pi++')

    expect(result.action).toEqual({
      orig: '12 pi++',
      type: 'damage',
      formula: '12',
      damagetype: 'pi++',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('1d ctrl', () => {
    const result = parseForRollOrDamage('1d ctrl')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      desc: 'ctrl',
      displayformula: '1d',
      formula: '1d6',
      hitlocation: undefined,
      next: undefined,
      orig: '1d ctrl',
      type: 'roll',
    })
  })

  test('2d-1x3 pi++ @torso', () => {
    const result = parseForRollOrDamage('2d-1x3 pi++ @torso')

    expect(result.action).toEqual({
      orig: '2d-1x3 pi++ @torso',
      type: 'damage',
      formula: '2d-1x3',
      damagetype: 'pi++',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: 'torso',
      accumulate: false,
      next: undefined,
    })
  })

  test('2d-1 imp *costs 1 FP', () => {
    const result = parseForRollOrDamage('2d-1 imp *costs 1 FP')

    expect(result.action).toEqual({
      orig: '2d-1 imp *costs 1 FP',
      type: 'damage',
      formula: '2d-1',
      damagetype: 'imp',
      extdamagetype: undefined,
      costs: '*costs 1 FP',
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('2d-1(2) burn ex', () => {
    const result = parseForRollOrDamage('2d-1(2) burn ex')

    expect(result.action).toEqual({
      orig: '2d-1(2) burn ex',
      type: 'damage',
      formula: '2d-1(2)',
      damagetype: 'burn',
      extdamagetype: 'ex',
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('8(0.5) burn ex', () => {
    const result = parseForRollOrDamage('8(0.5) burn ex')

    expect(result.action).toEqual({
      orig: '8(0.5) burn ex',
      type: 'damage',
      formula: '8(0.5)',
      damagetype: 'burn',
      extdamagetype: 'ex',
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('8', () => {
    expect(parseForRollOrDamage('8')).toBeUndefined()
  })

  test('2d burn, 1d tox', () => {
    const result = parseForRollOrDamage('2d burn, 1d tox')

    expect(result.action).toEqual({
      orig: '2d burn, 1d tox',
      type: 'damage',
      formula: '2d',
      damagetype: 'burn',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: {
        accumulate: false,
        costs: undefined,
        damagetype: 'tox',
        extdamagetype: undefined,
        formula: '1d',
        hitlocation: undefined,
        next: undefined,
        orig: '1d tox',
        type: 'damage',
      },
    })
  })

  test('2d burn, foo', () => {
    const result = parseForRollOrDamage('2d burn, foo')

    expect(result.action).toEqual({
      orig: '2d burn, foo',
      type: 'damage',
      formula: '2d',
      damagetype: 'burn',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('2d charm fat', () => {
    const result = parseForRollOrDamage('2d charm fat')

    expect(result.action).toEqual({
      orig: '2d charm fat',
      type: 'damage',
      formula: '2d',
      damagetype: 'fat',
      extdamagetype: undefined,
      costs: undefined,
      hitlocation: undefined,
      accumulate: false,
      next: undefined,
    })
  })

  test('sw+1 cut', () => {
    const result = parseForRollOrDamage('sw+1 cut')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      damagetype: 'cut',
      derivedformula: 'sw',
      extdamagetype: undefined,
      formula: '+1',
      hitlocation: undefined,
      orig: 'sw+1 cut',
      type: 'deriveddamage',
    })
  })

  test('sw+1 ctrl', () => {
    const result = parseForRollOrDamage('sw+1 ctrl')

    expect(result.action).toEqual({
      accumulate: false,
      costs: undefined,
      derivedformula: 'sw',
      desc: 'ctrl',
      formula: '+1',
      hitlocation: undefined,
      orig: 'sw+1 ctrl',
      type: 'derivedroll',
    })
  })
})
