import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'
import { SlamCalculator } from '../../module/chat/slam-calc.js'

const i18n = {
  'GURPS.rolled': 'Rolled',
  'GURPS.slamAOAStrong': 'All-out Attack (Strong)',
  'GURPS.slamShieldDB': 'Shield DB',
  'GURPS.notAffected': 'is not affected',
  'GURPS.fallsDown': 'falls down!',
  'GURPS.dxCheckOrFail': '...must make',
}

describe('SlamCalculator', () => {
  global.renderTemplate = jest.fn((template, result) => {})
  global.CONST = { CHAT_MESSAGE_TYPES: { ROLL: '' } }
  global.CONFIG = { sounds: { dice: null } }
  global.ChatMessage = { create: jest.fn(data => {}) }
  global.isNiceDiceEnabled = () => false

  const mockRoll = jest.fn()
  const localize = jest.fn()
  const slam = new SlamCalculator({ generateUniqueId: () => 42 })

  afterEach(() => jest.resetAllMocks())

  beforeEach(() => {
    localize.mockImplementation(key => {
      return i18n[key]
    })
    global.game = { i18n: { localize: localize }, user: { _id: 42 } }
    global.Roll = { create: mockRoll }
  })

  test('has constructor', () => {
    expect(slam).not.toBeNull()
  })

  describe('renderTemplate', () => {
    test(`no bonus`, async () => {
      let data = {
        target: 'Boob',
        attackerHp: 22,
        relativeSpeed: 7,
        isAoAStrong: false,
        targetHp: 14,
        shieldDB: 0,
      }

      mockRoll //
        .mockReturnValueOnce(mockRollResult([2, 3], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let mock = global.renderTemplate.mock
      let templateData = mock.calls[0][1]

      expect(templateData.id).toBe(42)

      expect(templateData.attackerHp).toBe(22)
      expect(templateData.attackerRaw).toBe(1.54)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(templateData.attackerExplain).toBe(`Rolled (2,3)`)
      expect(templateData.attackerResult).toBe(5)
      expect(templateData.shieldDB).toBe(0)

      expect(templateData.targetHp).toBe(14)
      expect(templateData.targetRaw).toBe(0.98)
      expect(templateData.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(templateData.targetExplain).toBe(`Rolled (1) - 1`)
      expect(templateData.targetResult).toBe(1)

      expect(templateData.isAoAStrong).toBe(false)
      expect(templateData.relativeSpeed).toBe(7)
      expect(templateData.result).toBe('Boob falls down!')
    })

    test(`with shield DB`, async () => {
      let data = {
        target: 'Boob',
        attackerHp: 22,
        relativeSpeed: 7,
        isAoAStrong: false,
        targetHp: 14,
        shieldDB: 1,
      }

      mockRoll //
        .mockReturnValueOnce(mockRollResult([2, 3], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let mock = global.renderTemplate.mock
      let arg = mock.calls[0][1]

      expect(arg.id).toBe(42)

      expect(arg.attackerHp).toBe(22)
      expect(arg.attackerRaw).toBe(1.54)
      expect(arg.shieldDB).toBe(1)
      expect(arg.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(arg.attackerExplain).toBe('Rolled (2,3) + 1 (Shield DB)')
      expect(arg.attackerResult).toBe(6)

      expect(arg.targetHp).toBe(14)
      expect(arg.targetRaw).toBe(0.98)
      expect(arg.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(arg.targetExplain).toBe('Rolled (1) - 1')
      expect(arg.targetResult).toBe(1)

      expect(arg.effect).toBe('GURPS.fallsDown')
      expect(arg.isAoAStrong).toBe(false)
      expect(arg.relativeSpeed).toBe(7)
      expect(arg.result).toBe('Boob falls down!')
    })

    test(`with All out Attack`, async () => {
      let data = {
        target: 'Boob',
        attackerHp: 22,
        relativeSpeed: 7,
        isAoAStrong: true,
        targetHp: 14,
        shieldDB: 0,
      }

      mockRoll //
        .mockReturnValueOnce(mockRollResult([2, 3], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let mock = global.renderTemplate.mock
      let arg = mock.calls[0][1]
      expect(arg.id).toBe(42)
      expect(arg.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(arg.attackerExplain).toBe('Rolled (2,3) + 2 (All-out Attack (Strong))')
      expect(arg.attackerHp).toBe(22)
      expect(arg.attackerRaw).toBe(1.54)
      expect(arg.attackerResult).toBe(7)
      expect(arg.effect).toBe('GURPS.fallsDown')
      expect(arg.isAoAStrong).toBe(true)
      expect(arg.relativeSpeed).toBe(7)
      expect(arg.result).toBe('Boob falls down!')
      expect(arg.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(arg.targetExplain).toBe('Rolled (1) - 1')
      expect(arg.targetHp).toBe(14)
      expect(arg.targetRaw).toBe(0.98)
      expect(arg.targetResult).toBe(1)
    })

    test(`test attacker falls down`, async () => {
      let data = {
        attacker: 'Helmet',
        target: 'Boob',
        attackerHp: 22,
        relativeSpeed: 7,
        isAoAStrong: false,
        targetHp: 14,
      }

      mockRoll.mockReturnValueOnce(mockRollResult([1, 1], 0)).mockReturnValueOnce(mockRollResult([6], -1))

      await slam.process(data)

      let mock = global.renderTemplate.mock
      let arg = mock.calls[0][1]
      expect(arg.id).toBe(42)
      expect(arg.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(arg.attackerExplain).toBe('Rolled (1,1)')
      expect(arg.attackerHp).toBe(22)
      expect(arg.attackerRaw).toBe(1.54)
      expect(arg.attackerResult).toBe(2)
      expect(arg.effect).toBe('GURPS.fallsDown')
      expect(arg.isAoAStrong).toBe(false)
      expect(arg.relativeSpeed).toBe(7)
      expect(arg.result).toBe('Helmet falls down!')
      expect(arg.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(arg.targetExplain).toBe('Rolled (6) - 1')
      expect(arg.targetHp).toBe(14)
      expect(arg.targetRaw).toBe(0.98)
      expect(arg.targetResult).toBe(5)
    })

    test('AOA + Shield DB', async () => {
      let data = {
        target: 'Boob',
        attackerHp: 16,
        relativeSpeed: 6,
        isAoAStrong: true,
        targetHp: 10,
        shieldDB: 1,
      }

      mockRoll //
        .mockReturnValueOnce(mockRollResult([5], -1))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let mock = global.renderTemplate.mock
      let arg = mock.calls[0][1]
      expect(arg.id).toBe(42)
      expect(arg.attackerDice).toEqual({ dice: 1, adds: -1 })
      expect(arg.attackerExplain).toBe('Rolled (5) - 1 + 2 (All-out Attack (Strong)) + 1 (Shield DB)')
      expect(arg.attackerHp).toBe(16)
      expect(arg.attackerRaw).toBe(0.96)
      expect(arg.attackerResult).toBe(7)
      expect(arg.effect).toBe('GURPS.fallsDown')
      expect(arg.isAoAStrong).toBe(true)
      expect(arg.relativeSpeed).toBe(6)
      expect(arg.result).toBe('Boob falls down!')
      expect(arg.targetDice).toEqual({ dice: 1, adds: -1 })
      expect(arg.targetExplain).toBe('Rolled (1) - 1')
      expect(arg.targetHp).toBe(10)
      expect(arg.targetRaw).toBe(0.6)
      expect(arg.targetResult).toBe(1)
    })
  })
})

const mockRollResult = function (rolls, adds) {
  return {
    evaluate: () => {},
    total:
      rolls.reduce((a, b) => {
        return a + b
      }, 0) + adds,
    dice: rolls.map(it => {
      return {
        results: [{ result: it }],
      }
    }),
    // dice: [{ results: [{ result: 2 }] }, { results: [{ result: 3 }] }],

    terms: [`${rolls.length}d6`, `${adds < 0 ? '-' : '+'}`, `${Math.abs(adds)}`],
  }
}
