import DamageChat, { createDamageRollData, getDiceData, prepareChatData } from '@module/damage/damagechat.js'
import { GurpsRoll } from '@module/modifier-bucket/bucket-app.js'
import type { ActionFuncContext } from '@module/otf/actionFuncs.js'
import { applyModifierDescription } from '@module/otf/description-utilities.js'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@module/otf/description-utilities.js', () => ({
  applyModifierDescription: vi.fn(),
}))

describe('DamageChat.getDiceData', () => {
  const warn = vi.fn()

  beforeEach(() => {
    warn.mockReset()
    ;(globalThis as any).ui = { notifications: { warn } }
    ;(globalThis as any).GURPS = {
      lastTargetedRoll: { margin: 4 },
    }
  })
  test.each([
    [
      '3d+2x4(2)',
      'cut',
      [{ modint: 1 }] as Modifier[],
      {
        formula: '3d6[Damage]+2',
        diceText: '3d+2×4 (2)',
        rolled: true,
        modifier: 1,
        damageType: 'cut',
        multiplier: 4,
        divisor: 2,
        adds1: 2,
        adds2: 0,
        min: 1,
      },
    ],
    [
      '3d+2x4 (2)',
      'cut',
      [] as Modifier[],
      {
        formula: '3d6[Damage]+2',
        diceText: '3d+2×4 (2)',
        rolled: true,
        modifier: 0,
        damageType: 'cut',
        multiplier: 4,
        divisor: 2,
        adds1: 2,
        adds2: 0,
        min: 1,
      },
    ],
    [
      '3d+2×4 (2)',
      'cut',
      [] as Modifier[],
      {
        formula: '3d6[Damage]+2',
        diceText: '3d+2×4 (2)',
        rolled: true,
        modifier: 0,
        damageType: 'cut',
        multiplier: 4,
        divisor: 2,
        adds1: 2,
        adds2: 0,
        min: 1,
      },
    ],
    [
      '1d-2+3',
      'burn',
      [] as Modifier[],
      {
        formula: '1d6[Damage]-2+3',
        diceText: '1d-2+3',
        rolled: true,
        modifier: 0,
        damageType: 'burn',
        multiplier: 1,
        divisor: 0,
        adds1: -2,
        adds2: 3,
        min: 1,
      },
    ],
    [
      '2d',
      'cr',
      [] as Modifier[],
      {
        formula: '2d6[Damage]',
        diceText: '2d',
        rolled: true,
        modifier: 0,
        damageType: 'cr',
        multiplier: 1,
        divisor: 0,
        adds1: 0,
        adds2: 0,
        min: 0,
      },
    ],
    [
      '1d-3!',
      'cr',
      [] as Modifier[],
      {
        formula: '1d6[Damage]-3',
        diceText: '1d-3!',
        rolled: true,
        modifier: 0,
        damageType: 'cr',
        multiplier: 1,
        divisor: 0,
        adds1: -3,
        adds2: 0,
        min: 1,
      },
    ],
    [
      '5',
      'cr',
      [] as Modifier[],
      {
        formula: '5',
        diceText: '5',
        rolled: false,
        modifier: 0,
        damageType: 'cr',
        multiplier: 1,
        divisor: 0,
        adds1: 0,
        adds2: 0,
        min: 0,
      },
    ],
  ])('parses valid damage formula %s', (formula, damageType, targetmods, expected) => {
    const result = getDiceData(formula, damageType, targetmods, null, null)

    expect(result).not.toBeNull()
    expect(result).toMatchObject(expected)
  })

  test('resolves @margin in the first add', () => {
    const result = getDiceData('1d-@margin', 'cut', [] as Modifier[], null, null)

    expect(result).not.toBeNull()
    expect(result?.adds1).toBe(-4)
    expect(result?.formula).toBe('1d6[Damage]-@margin')
    expect(result?.diceText).toBe('1d-@margin')
  })

  test('uses overrideDiceText when provided', () => {
    const result = getDiceData('3d', 'cut', [] as Modifier[], '3d+2', null)

    expect(result).not.toBeNull()
    expect(result?.formula).toBe('3d6[Damage]')
    expect(result?.diceText).toBe('3d+2')
  })

  test('returns null and warns for invalid dice formulas', () => {
    const result = getDiceData('abc', 'cut', [] as Modifier[], null, null)

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalledWith('Invalid Dice formula: "abc"')
  })

  test('defaults an empty damage type to dmg', () => {
    const result = getDiceData('1d', '', [] as Modifier[], null, null)

    expect(result).not.toBeNull()
    expect(result?.damageType).toBe('dmg')
    expect(result?.min).toBe(1)
  })

  test('replace minus (&#8722;) with hyphen', () => {
    const result = getDiceData('1d−1', 'cut', [] as Modifier[], null, null)

    expect(result).not.toBeNull()
    expect(result?.diceText).toBe('1d-1')
    expect(result?.formula).toBe('1d6[Damage]-1')
  })

  test('matches the expected regex structure', () => {
    expect(DamageChat.fullRegex.test('3d+2x4(2)')).toBe(true)
    expect(DamageChat.fullRegex.test('1d-2+3')).toBe(true)
    expect(DamageChat.fullRegex.test('abc')).toBe(false)
  })
})

describe('prepareChatData', () => {
  const mockApplyModifierDescription = vi.mocked(applyModifierDescription)
  const mockApplyMods = vi.fn()
  const mockRollCreate = vi.fn()
  const mockCurrentSum = vi.fn()
  const mockRoll = {
    result: '8',
    total: 8,
    dice: [{ results: [{ result: 4 }, { result: 4 }] }],
    isLoaded: false,
    evaluate: vi.fn(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    mockApplyModifierDescription.mockReset()
    mockApplyMods.mockReset().mockReturnValue([{ modint: 1, mod: '+1', desc: '*Costs 1FP' }])
    mockRollCreate.mockReset().mockReturnValue(mockRoll)
    mockCurrentSum.mockReset().mockReturnValue(0)
    mockRoll.evaluate.mockReset().mockResolvedValue(mockRoll as unknown as GurpsRoll)
    ;(globalThis as any).GURPS = {
      ModifierBucket: {
        applyMods: mockApplyMods,
        currentSum: mockCurrentSum,
      },
      lastTargetedRoll: {},
      SYSTEM_NAME: 'gurps',
    }
    ;(globalThis as any).game = {
      user: { targets: new Set() },
      settings: { get: vi.fn().mockReturnValue(false) },
    }
    ;(globalThis as any).Roll = { create: mockRollCreate }
  })

  test('rolls each target and applies modifier descriptions for every roll', async () => {
    const actor = { id: 'ACTOR_ID' } as Actor.Implementation

    const result = await prepareChatData(actor, '1d', 'cut', null, null, ['Target A', 'Target B'], null, 'neck')

    expect(mockRollCreate).toHaveBeenCalledTimes(2)
    expect(mockRollCreate).toHaveBeenCalledWith('1d6[Damage]+0')
    expect(mockRoll.evaluate).toHaveBeenCalledTimes(2)
    expect(mockApplyModifierDescription).toHaveBeenNthCalledWith(1, actor, '*Costs 1FP')
    expect(mockApplyModifierDescription).toHaveBeenNthCalledWith(2, actor, '*Costs 1FP')
    expect(result?.draggableData.map(({ target, hitlocation }) => ({ target, hitlocation }))).toEqual([
      { target: 'Target A', hitlocation: 'neck' },
      { target: 'Target B', hitlocation: 'neck' },
    ])
    expect(result?.rolled).toBe(true)
  })

  test('does not apply empty modifier descriptions', async () => {
    mockApplyMods.mockReturnValue([{ modint: 0, mod: '', desc: '' }] as Modifier[])

    await prepareChatData(null, '1d', 'cr', null, null, undefined)

    expect(mockRollCreate).toHaveBeenCalledTimes(1)
    expect(mockApplyModifierDescription).not.toHaveBeenCalled()
  })

  test.each([
    [
      '3d+2x4(2)',
      'cut',
      [{ modint: 1, mod: '+1', desc: 'damage' }] as Modifier[],
      {
        formula: '3d6[Damage]+2+1',
        rolled: true,
        dice: '3d+3×4 (2)',
        damageType: 'cut',
        contextDamageTypeText: 'cut ',
        damageTypeText: "'cut' ",
        modifiers: ['+1 damage'],
        damage: 32,
        damageModifier: null,
        armorDivisor: 2,
        explainLineOne: 'Rolled (4,4) + 3 = 11.',
        explainLineTwo: 'Total = (11 + 0) × 4 = 32.',
      },
    ],
    [
      '3d+2x4 (2)',
      'cut',
      [] as Modifier[],
      {
        formula: '3d6[Damage]+2+0',
        rolled: true,
        dice: '3d+2×4 (2)',
        damageType: 'cut',
        contextDamageTypeText: 'cut ',
        damageTypeText: "'cut' ",
        modifiers: [],
        damage: 32,
        damageModifier: null,
        armorDivisor: 2,
        explainLineOne: 'Rolled (4,4) + 2 = 10.',
        explainLineTwo: 'Total = 10 × 4 = 32.',
      },
    ],
    [
      '3d+2×4 (2)',
      'cut',
      [] as Modifier[],
      {
        formula: '3d6[Damage]+2+0',
        rolled: true,
        dice: '3d+2×4 (2)',
        damageType: 'cut',
        contextDamageTypeText: 'cut ',
        damageTypeText: "'cut' ",
        modifiers: [],
        damage: 32,
        damageModifier: null,
        armorDivisor: 2,
        explainLineOne: 'Rolled (4,4) + 2 = 10.',
        explainLineTwo: 'Total = 10 × 4 = 32.',
      },
    ],
    [
      '1d-2+3',
      'burn',
      [] as Modifier[],
      {
        formula: '1d6[Damage]-2+3+0',
        rolled: true,
        dice: '1d-2+3',
        damageType: 'burn',
        contextDamageTypeText: 'burn ',
        damageTypeText: "'burn' ",
        modifiers: [],
        damage: 8,
        damageModifier: null,
        armorDivisor: 0,
        explainLineOne: 'Rolled (4,4) − 2 + 3 = 9.',
        explainLineTwo: null,
      },
    ],
    [
      '2d',
      'cr',
      [] as Modifier[],
      {
        formula: '2d6[Damage]+0',
        rolled: true,
        dice: '2d',
        damageType: 'cr',
        contextDamageTypeText: 'cr ',
        damageTypeText: "'cr' ",
        modifiers: [],
        damage: 8,
        damageModifier: null,
        armorDivisor: 0,
        explainLineOne: 'Rolled (4,4) = 8.',
        explainLineTwo: null,
      },
    ],
    [
      '1d-3!',
      'cr',
      [] as Modifier[],
      {
        formula: '1d6[Damage]-3+0',
        rolled: true,
        dice: '1d-3!',
        damageType: 'cr',
        contextDamageTypeText: 'cr ',
        damageTypeText: "'cr' ",
        modifiers: [],
        damage: 8,
        damageModifier: null,
        armorDivisor: 0,
        explainLineOne: 'Rolled (4,4) − 3 = 5.',
        explainLineTwo: null,
      },
    ],
    [
      '5',
      'cr',
      [] as Modifier[],
      {
        formula: '5+0',
        rolled: false,
        dice: '5',
        damageType: 'cr',
        contextDamageTypeText: 'cr ',
        damageTypeText: "'cr' ",
        modifiers: [],
        damage: 8,
        damageModifier: null,
        armorDivisor: 0,
        explainLineOne: 'Rolled (4,4) = 8.',
        explainLineTwo: null,
      },
    ],
  ])('prepares chat data for damage formula %s', async (formula, damageType, targetmods, expected) => {
    mockApplyMods.mockReturnValue(targetmods)
    mockCurrentSum.mockReturnValue(targetmods.reduce((sum, mod) => sum + mod.modint, 0))
    const actor = { id: 'ACTOR_ID' } as Actor.Implementation

    const result = await prepareChatData(actor, formula, damageType, null, null, ['Target'], null, 'torso')
    const damageRoll = result?.draggableData[0]

    expect(result).toMatchObject({
      rolled: expected.rolled,
      dice: expected.dice,
      loaded: false,
      damageTypeText: expected.contextDamageTypeText,
      modifiers: expected.modifiers,
      userTarget: undefined,
      hitlocation: 'torso',
      numtimes: '',
    })
    expect(damageRoll).toMatchObject({
      attacker: 'ACTOR_ID',
      dice: expected.dice,
      damageType: expected.damageType,
      damageTypeText: expected.damageTypeText,
      damageModifier: expected.damageModifier,
      armorDivisor: expected.armorDivisor,
      damage: expected.damage,
      hasExplanation: true,
      explainLineOne: expected.explainLineOne,
      explainLineTwo: expected.explainLineTwo,
      isB378: false,
      target: 'Target',
      hitlocation: 'torso',
    })
    expect(damageRoll?.roll).toBe(mockRoll)
    expect(mockRollCreate).toHaveBeenCalledWith(expected.formula)
  })

  test('repeats the damage roll when event.data.repeat is 2', async () => {
    const event = { shiftKey: false, ctrlKey: false, altKey: false, data: { repeat: 2 } } satisfies ActionFuncContext

    const result = await prepareChatData(null, '1d', 'cut', event, null, undefined)

    expect(mockRollCreate).toHaveBeenCalledTimes(2)
    expect(mockRoll.evaluate).toHaveBeenCalledTimes(2)
    expect(result?.draggableData.map(({ target }) => target)).toEqual(['0', '1'])
    expect(result?.numtimes).toBe(' x2')
    expect(mockApplyModifierDescription).toHaveBeenCalledTimes(2)
  })
})

describe('createDamageRollData', () => {
  beforeEach(() => {
    ;(globalThis as any).game = {
      user: { id: 'USER_ID' },
    }
  })

  test('builds the payload and explanation text for a rolled damage result', () => {
    const payload = createDamageRollData(
      { id: 'ACTOR_ID' } as Actor.Implementation,
      {
        formula: '3d6[Damage]+2',
        rolled: true,
        modifier: 1,
        diceText: '3d+2',
        damageType: 'cut',
        extdamagetype: null,
        multiplier: 1,
        divisor: 0,
        adds1: 2,
        adds2: 0,
        min: 1,
      },
      'Target',
      [{ modint: 1, mod: '+1', desc: 'damage' }] as Modifier[],
      'head',
      {
        result: '9',
        total: 12,
        dice: [{ results: [{ result: 1 }, { result: 3 }, { result: 5 }] }],
        isLoaded: false,
      } as unknown as GurpsRoll
    )

    expect(payload).toMatchObject({
      attacker: 'ACTOR_ID',
      dice: '3d+2',
      damageType: 'cut',
      damageTypeText: "'cut' ",
      damageModifier: null,
      armorDivisor: 0,
      damage: 12,
      target: 'Target',
      hitlocation: 'head',
      isB378: false,
    })
    expect(payload.hasExplanation).toBe(true)
    expect(payload.explainLineOne).toBe('Rolled (1,3,5) + 2 = 11.')
    expect(payload.explainLineTwo).toBe('Total = 11 + 1 = 12.')
  })

  test.each([
    ['cr', false],
    ['cut', true],
    ['burn', true],
  ])('clamps a low roll to min=1 for %s damage and marks B378 only for non-CR types', (damageType, expectedB378) => {
    const payload = createDamageRollData(
      { id: 'ACTOR_ID' } as Actor.Implementation,
      {
        formula: '1d6[Damage]',
        rolled: true,
        modifier: 2,
        diceText: '1d',
        damageType,
        extdamagetype: null,
        multiplier: 1,
        divisor: 0,
        adds1: 0,
        adds2: 0,
        min: 1,
      },
      'Target',
      [{ modint: 2, mod: '-2', desc: 'damage' }] as Modifier[],
      null,
      {
        result: '1',
        total: -1,
        dice: [{ results: [{ result: 1 }] }],
        isLoaded: false,
      } as unknown as GurpsRoll
    )

    expect(payload.damage).toBe(1)
    expect(payload.isB378).toBe(expectedB378)
    expect(payload.explainLineTwo).toContain('Total =')

    if (expectedB378) {
      expect(payload.explainLineTwo).toContain('*')
    } else {
      expect(payload.explainLineTwo).not.toContain('*')
    }
  })
})
