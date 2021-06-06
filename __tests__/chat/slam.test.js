import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'
import { SlamCalculator } from '../../module/chat/slam-calc.js'

const i18n = {
  'GURPS.rolled': 'Rolled',
  'GURPS.slamAOAStrong': 'All-out Attack (Strong)',
  'GURPS.slamShieldDB': 'Shield DB',
  'GURPS.notAffected': 'Boob is not affected',
  'GURPS.fallsDownApplyProne': 'Boob falls down!',
  'GURPS.dxCheckOrFallApplyProne': 'Boob must roll DX or fall!',
}

describe('SlamCalculator', () => {
  global.CONST = { CHAT_MESSAGE_TYPES: { ROLL: '' } }
  global.CONFIG = { sounds: { dice: null } }
  global.ChatMessage = { create: jest.fn(data => {}) }
  global.isNiceDiceEnabled = () => false

  const mockRoll = jest.fn()
  const localize = jest.fn()
  const slam = new SlamCalculator({ generateUniqueId: () => 42 })
  const bonusForAoA = 2
  const attacker = { id: 'AAAaaaddd', name: 'Doofus' }
  const target = { id: 'TTTtttaaa', name: 'Boob' }

  const data = {
    attackerToken: attacker,
    targetToken: target,
    attackerHp: 0,
    relativeSpeed: 0,
    isAoAStrong: false,
    targetHp: 0,
    shieldDB: 0,
  }

  afterEach(() => jest.resetAllMocks())

  beforeEach(() => {
    localize.mockImplementation(key => i18n[key])
    global.renderTemplate = jest.fn((template, result) => {
      return ''
    })
    global.game = {
      i18n: {
        localize: localize,
        format: localize,
        has: function (_) {
          return true
        },
      },
      user: { _id: 42 },
    }
    global.Roll = { create: mockRoll }
  })

  test('should have constructor', () => {
    expect(slam).not.toBeNull()
  })

  describe('should return the correct dice based on velocity and speed', () => {
    test(`1/4 dice damage`, async () => {
      data.attackerHp = 25
      data.relativeSpeed = 1
      data.targetHp = 26

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1], -3))
        .mockReturnValueOnce(mockRollResult([1], -2))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(25)
      expect(templateData.attackerRaw).toBe(0.25)
      expect(templateData.attackerDice).toEqual({ dice: 1, adds: -3 })

      expect(templateData.targetHp).toBe(26)
      expect(templateData.targetRaw).toBe(0.26)
      expect(templateData.targetDice).toEqual({ dice: 1, adds: -2 })
    })

    test(`1/2 dice damage`, async () => {
      data.attackerHp = 25
      data.relativeSpeed = 2
      data.targetHp = 26

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1], -2))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(25)
      expect(templateData.attackerRaw).toBe(0.5)
      expect(templateData.attackerDice).toEqual({ dice: 1, adds: -2 })

      expect(templateData.targetHp).toBe(26)
      expect(templateData.targetRaw).toBe(0.52)
      expect(templateData.targetDice).toEqual({ dice: 1, adds: -1 })
    })

    test(`over 1/2 dice damage`, async () => {
      data.attackerHp = 24
      data.relativeSpeed = 4
      data.targetHp = 26

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1], -1))
        .mockReturnValueOnce(mockRollResult([1], 0))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(24)
      expect(templateData.attackerRaw).toBe(0.96)
      expect(templateData.attackerDice).toEqual({ dice: 1, adds: -1 })

      expect(templateData.targetHp).toBe(26)
      expect(templateData.targetRaw).toBe(1.04)
      expect(templateData.targetDice).toEqual({ dice: 1, adds: 0 })
    })

    test(`1 dice damage`, async () => {
      data.attackerHp = 20
      data.relativeSpeed = 5
      data.targetHp = 29

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1], 0))
        .mockReturnValueOnce(mockRollResult([1], 0))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(20)
      expect(templateData.attackerRaw).toBe(1.0)
      expect(templateData.attackerDice).toEqual({ dice: 1, adds: 0 })

      expect(templateData.targetHp).toBe(29)
      expect(templateData.targetRaw).toBe(1.45)
      expect(templateData.targetDice).toEqual({ dice: 1, adds: 0 })
    })

    test(`1.5 dice round up to 2d damage`, async () => {
      data.attackerHp = 15
      data.relativeSpeed = 10
      data.targetHp = 20

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2], 0))
        .mockReturnValueOnce(mockRollResult([1, 2], 0))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(15)
      expect(templateData.attackerRaw).toBe(1.5)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })

      expect(templateData.targetHp).toBe(20)
      expect(templateData.targetRaw).toBe(2)
      expect(templateData.targetDice).toEqual({ dice: 2, adds: 0 })
    })

    test(`2.5 dice round up to 3d damage`, async () => {
      data.attackerHp = 5
      data.relativeSpeed = 50
      data.targetHp = 6

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2, 3], 0))
        .mockReturnValueOnce(mockRollResult([1, 2], 0))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(5)
      expect(templateData.attackerRaw).toBe(2.5)
      expect(templateData.attackerDice).toEqual({ dice: 3, adds: 0 })

      expect(templateData.targetHp).toBe(6)
      expect(templateData.targetRaw).toBe(3)
      expect(templateData.targetDice).toEqual({ dice: 3, adds: 0 })
    })
  })

  describe(`should adjust attacker's dice for All-out Attack`, () => {
    let resultWithoutBonus = 3
    // const data = {
    //   target: 'Boob',
    //   attackerHp: 22,
    //   relativeSpeed: 7,
    //   isAoAStrong: false,
    //   targetHp: 14,
    //   shieldDB: 0,
    //   _targetToken: target,
    //   _attackerToken: attacker,
    // }

    test(`no bonus`, async () => {
      data.isAoAStrong = false
      data.attackerHp = 22
      data.relativeSpeed = 7

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(22)
      expect(templateData.attackerRaw).toBe(1.54)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(templateData.isAoAStrong).toBe(false)
      expect(templateData.shieldDB).toBe(0)

      expect(templateData.attackerResult).toBe(resultWithoutBonus)
    })

    test(`All-out Attack (Strong) bonus`, async () => {
      data.isAoAStrong = true

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(22)
      expect(templateData.attackerRaw).toBe(1.54)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(templateData.isAoAStrong).toBe(true)
      expect(templateData.shieldDB).toBe(0)

      expect(templateData.attackerResult).toBe(resultWithoutBonus + bonusForAoA)
    })
  })

  describe(`should adjust attacker's dice for Shield DB`, () => {
    let resultWithoutBonus = 3

    test(`Shield DB = 1`, async () => {
      let shieldDB = 1
      data.shieldDB = shieldDB
      data.isAoAStrong = false

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(22)
      expect(templateData.attackerRaw).toBe(1.54)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(templateData.isAoAStrong).toBe(false)
      expect(templateData.shieldDB).toBe(1)

      expect(templateData.attackerResult).toBe(resultWithoutBonus + shieldDB)
    })

    test(`Shield DB = 3`, async () => {
      let shieldDB = 3
      data.shieldDB = shieldDB

      mockRoll //
        .mockReturnValueOnce(mockRollResult([1, 2], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerHp).toBe(22)
      expect(templateData.attackerRaw).toBe(1.54)
      expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
      expect(templateData.isAoAStrong).toBe(false)
      expect(templateData.shieldDB).toBe(3)

      expect(templateData.attackerResult).toBe(resultWithoutBonus + shieldDB)
    })
  })

  test(`Shield DB and All-out Attack are cumulative`, async () => {
    let resultWithoutBonus = 3
    let shieldDB = 2
    data.isAoAStrong = true
    data.shieldDB = shieldDB

    mockRoll //
      .mockReturnValueOnce(mockRollResult([1, 2], 0))
      .mockReturnValueOnce(mockRollResult([1], -1))

    await slam.process(data)

    let mock = global.renderTemplate.mock
    let templateData = mock.calls[0][1]

    expect(templateData.attackerHp).toBe(22)
    expect(templateData.attackerRaw).toBe(1.54)
    expect(templateData.attackerDice).toEqual({ dice: 2, adds: 0 })
    expect(templateData.isAoAStrong).toBe(true)
    expect(templateData.shieldDB).toBe(shieldDB)

    expect(templateData.attackerResult).toBe(resultWithoutBonus + shieldDB + bonusForAoA)
  })

  describe('explain Dice Roll', () => {
    test(`no bonus`, async () => {
      data.isAoAStrong = false
      data.shieldDB = 0

      mockRoll //
        .mockReturnValueOnce(mockRollResult([2, 3], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let templateData = global.renderTemplate.mock.calls[0][1]

      expect(templateData.attackerExplain).toBe('Rolled (2,3)')
    })

    test(`with shield DB`, async () => {
      data.shieldDB = 1
      data.isAoAStrong = false

      mockRoll //
        .mockReturnValueOnce(mockRollResult([4, 4], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]

      expect(arg.attackerExplain).toBe('Rolled (4,4) + 1 (Shield DB)')
    })

    test(`with All-out Attack`, async () => {
      data.isAoAStrong = true
      data.shieldDB = 0

      mockRoll //
        .mockReturnValueOnce(mockRollResult([5, 1], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]

      expect(arg.attackerExplain).toBe('Rolled (5,1) + 2 (All-out Attack (Strong))')
    })

    test(`with All-out Attack and Shield DB`, async () => {
      data.isAoAStrong = true
      data.shieldDB = 1

      mockRoll //
        .mockReturnValueOnce(mockRollResult([5, 6], 0))
        .mockReturnValueOnce(mockRollResult([1], -1))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]

      expect(arg.attackerExplain).toBe('Rolled (5,6) + 2 (All-out Attack (Strong)) + 1 (Shield DB)')
    })
  })

  describe(`results`, () => {
    const data = {
      attackerHp: 21,
      relativeSpeed: 7,
      isAoAStrong: false,
      targetHp: 16,
      shieldDB: 0,
      targetToken: target,
      attackerToken: attacker,
    }

    test(`target wins -- no effect`, async () => {
      const attackerRolls = [2, 3]
      const targetRolls = [2, 4]

      mockRoll //
        .mockReturnValueOnce(mockRollResult(attackerRolls, 0))
        .mockReturnValueOnce(mockRollResult(targetRolls, 0))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]
      expect(arg.attackerResult).toBe(5)
      expect(arg.targetResult).toBe(6)
      expect(arg.result).toBe('Boob is not affected')
    })

    test(`attacker wins -- DX check`, async () => {
      const attackerRolls = [2, 5]
      const targetRolls = [2, 4]

      mockRoll //
        .mockReturnValueOnce(mockRollResult(attackerRolls, 0))
        .mockReturnValueOnce(mockRollResult(targetRolls, 0))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]
      expect(arg.attackerResult).toBe(7)
      expect(arg.targetResult).toBe(6)
      expect(arg.result).toContain('Boob must roll [DX] or fall!')
    })

    test(`attacker wins by double -- target falls`, async () => {
      const attackerRolls = [6, 4]
      const targetRolls = [2, 3]

      mockRoll //
        .mockReturnValueOnce(mockRollResult(attackerRolls, 0))
        .mockReturnValueOnce(mockRollResult(targetRolls, 0))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]
      expect(arg.attackerResult).toBe(10)
      expect(arg.targetResult).toBe(5)
      expect(arg.result).toContain('Boob falls down!')
    })

    test(`target wins by double -- attacker falls`, async () => {
      const attackerRolls = [1, 3]
      const targetRolls = [5, 3]
      i18n['GURPS.fallsDownApplyProne'] = 'Doofus falls down!'

      mockRoll //
        .mockReturnValueOnce(mockRollResult(attackerRolls, 0))
        .mockReturnValueOnce(mockRollResult(targetRolls, 0))

      await slam.process(data)

      let arg = global.renderTemplate.mock.calls[0][1]
      expect(arg.attackerResult).toBe(4)
      expect(arg.targetResult).toBe(8)
      expect(arg.result).toContain('Doofus falls down!')
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
