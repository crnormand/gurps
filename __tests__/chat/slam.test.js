import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'
import { SlamCalculator } from '../../module/chat/slam-calc.js'

describe('SlamCalculator', () => {
  let localize = jest.fn()
  global.game = { i18n: { localize: localize }, user: { _id: 42 } }
  global.renderTemplate = jest.fn((template, result) => {})
  global.CONST = { CHAT_MESSAGE_TYPES: { ROLL: '' } }
  global.CONFIG = { sounds: { dice: null } }
  global.ChatMessage = { create: jest.fn(data => {}) }
  global.isNiceDiceEnabled = () => false

  afterEach(() => jest.resetAllMocks())

  let slam = new SlamCalculator({ generateUniqueId: () => 42 })

  test('has constructor', () => {
    expect(slam).not.toBeNull()
  })

  test(`validate the calculation`, () => {
    let data = {
      target: 'Boob',
      attackerHp: 22,
      relativeSpeed: 7,
      isAoAStrong: false,
      targetHp: 14,
    }

    let create = jest.fn()
    let results = jest.fn()

    localize.mockReturnValueOnce('falls down!')
    results.mockReturnValueOnce([4])
    create
      .mockReturnValueOnce({
        evaluate: () => {},
        total: 5,
        dice: [{ results: [{ result: 2 }] }, { results: [{ result: 3 }] }],
        terms: ['2d', '+', '0'],
      })
      .mockReturnValueOnce({
        evaluate: () => {},
        total: 1,
        dice: [{ results: [{ result: 1 }] }],
        terms: ['1d', '-', '1'],
      })

    global.Roll = { create: create }

    slam.process(data).then(result => {
      let mock = global.renderTemplate.mock
      let results = mock.calls[0][1]
      expect(results.id).toBe(42)
      expect(results.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(results.attackerExplain).toBe('Rolled (2,3) + 0')
      expect(results.attackerHp).toBe(22)
      expect(results.attackerRaw).toBe(1.54)
      expect(results.attackerResult).toBe(5)
      expect(results.effect).toBe('GURPS.fallsDown')
      expect(results.isAoAStrong).toBe(false)
      expect(results.relativeSpeed).toBe(7)
      expect(results.result).toBe('Boob falls down!')
      expect(results.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(results.targetExplain).toBe('Rolled (1) - 1')
      expect(results.targetHp).toBe(14)
      expect(results.targetRaw).toBe(0.98)
      expect(results.targetResult).toBe(1)
    })
  })

  test(`test attacker falls down`, () => {
    let data = {
      attacker: 'Helmet',
      target: 'Boob',
      attackerHp: 22,
      relativeSpeed: 7,
      isAoAStrong: false,
      targetHp: 14,
    }

    let create = jest.fn()
    let results = jest.fn()

    localize.mockReturnValueOnce('falls down!')
    results.mockReturnValueOnce([4])
    create
      .mockReturnValueOnce({
        evaluate: () => {},
        total: 2,
        dice: [{ results: [{ result: 1 }] }, { results: [{ result: 1 }] }],
        terms: ['2d', '+', '0'],
      })
      .mockReturnValueOnce({
        evaluate: () => {},
        total: 5,
        dice: [{ results: [{ result: 6 }] }],
        terms: ['1d', '-', '1'],
      })

    global.Roll = { create: create }

    slam.process(data).then(result => {
      let mock = global.renderTemplate.mock
      let results = mock.calls[0][1]
      expect(results.id).toBe(42)
      expect(results.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(results.attackerExplain).toBe('Rolled (1,1) + 0')
      expect(results.attackerHp).toBe(22)
      expect(results.attackerRaw).toBe(1.54)
      expect(results.attackerResult).toBe(2)
      expect(results.effect).toBe('GURPS.fallsDown')
      expect(results.isAoAStrong).toBe(false)
      expect(results.relativeSpeed).toBe(7)
      expect(results.result).toBe('Helmet falls down!')
      expect(results.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(results.targetExplain).toBe('Rolled (6) - 1')
      expect(results.targetHp).toBe(14)
      expect(results.targetRaw).toBe(0.98)
      expect(results.targetResult).toBe(5)
    })
  })
})
