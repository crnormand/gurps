import { ActionType } from '@module/action/types.js'
import {
  calcFailure,
  calcFinalTarget,
  calculateMessageMode,
  detectCriticals,
  getTargetedRollChatData,
} from '@module/otf/dieroll.js'
import { OtfActionType } from '@module/otf/types.js'
import { MessageMode } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('getTargetedRollChatData', () => {
  const makeRoll = (total: number) =>
    ({
      total,
      isLoaded: false,
      dice: [{ results: [{ result: total }, { result: 1 }] }],
    }) as any

  test.each([
    [15, 18, false, 3, false, false, '+3 margin for Test target', OtfActionType.attack],
    [5, 15, true, 10, false, false, '+10 margin for Test target', OtfActionType.attack],
    [17, 15, false, -2, true, true, '-2 margin for Test target', OtfActionType.attack],
    [12, 16, false, 4, false, false, '+4 margin for Test target', OtfActionType.skillSpell],
  ])(
    'builds chat data for roll=%s target=%s',
    (rtotal, finaltarget, isCritSuccess, margin, isCritFailure, failure, otf, actionType) => {
      const action = {
        type: actionType,
        followon: actionType === OtfActionType.attack ? 'follow-up' : undefined,
      } as any
      const result = getTargetedRollChatData(makeRoll(rtotal), finaltarget, action, undefined, 'Test target')

      expect(result.finaltarget).toBe(finaltarget)
      expect(result.rtotal).toBe(rtotal)
      expect(result.margin).toBe(margin)
      expect(result.failure).toBe(failure)
      expect(result.isCritSuccess).toBe(isCritSuccess)
      expect(result.isCritFailure).toBe(isCritFailure)
      expect(result.otf).toBe(otf)
      expect(result.followon).toBe(actionType === OtfActionType.attack ? 'follow-up' : undefined)
      expect(result.multiples).toHaveLength(1)
    }
  )

  test('includes rof and recoil data for a ranged attack with a positive margin', () => {
    const action = {
      type: OtfActionType.attack,
      shots: 4,
      followon: 'follow-up',
    } as any

    const attack = {
      isOfType: (type: string) => type === ActionType.RangedAttack,
      recoilText: '2',
      rofText: '4',
    } as any

    const result = getTargetedRollChatData(makeRoll(10), 15, action, attack, 'Test target')

    expect(result.margin).toBe(5)
    expect(result.rof).toBe('4')
    expect(result.rcl).toBe('2')
    expect(result.rofrcl).toBe(3)
    expect(result.followon).toBe('follow-up')
  })
})

describe('calculateMessageMode', () => {
  const originalGame = (globalThis as any).game

  beforeEach(() => {
    ;(globalThis as any).game = {
      keyboard: {
        isModifierActive: vi.fn(() => false),
      },
      settings: {
        get: vi.fn(() => false),
      },
      user: { isGM: false },
    }
    ;(globalThis as any).foundry = {
      helpers: {
        interaction: {
          KeyboardManager: {
            MODIFIER_KEYS: {
              CONTROL: 'Control',
              SHIFT: 'Shift',
            },
          },
        },
      },
    }
  })

  afterEach(() => {
    ;(globalThis as any).game = originalGame
  })

  test('returns blind when blindOverride is true', () => {
    expect(calculateMessageMode(MessageMode.Public, true)).toStrictEqual(MessageMode.Blind)
  })

  test('returns blind when ctrl key modifier is active and the setting is enabled', () => {
    ;(globalThis as any).game.keyboard.isModifierActive = vi.fn((key: string) => key === 'Control')
    ;(globalThis as any).game.settings.get = vi.fn((system: string, key: string) =>
      key === Settings.SETTING_CTRL_KEY ? true : false
    )

    expect(calculateMessageMode(MessageMode.Public, false)).toStrictEqual(MessageMode.Blind)
  })

  test('returns blind when shift key modifier is active for a non-GM player and the setting is enabled', () => {
    ;(globalThis as any).game.keyboard.isModifierActive = vi.fn((key: string) => key === 'Shift')
    ;(globalThis as any).game.settings.get = vi.fn((system: string, key: string) =>
      key === Settings.SETTING_SHIFT_CLICK_BLIND ? true : false
    )

    expect(calculateMessageMode(MessageMode.Public, false)).toStrictEqual(MessageMode.Blind)
  })

  test('returns self when shift key modifier is active without the blind override', () => {
    ;(globalThis as any).game.keyboard.isModifierActive = vi.fn((key: string) => key === 'Shift')

    expect(calculateMessageMode(MessageMode.Public, false)).toStrictEqual(MessageMode.Self)
  })
})

describe('calcFailure', () => {
  test.each([
    [16, 3, { seventeen: false, failure: false }],
    [16, -1, { seventeen: false, failure: true }],
    [17, 2, { seventeen: true, failure: true }],
    [17, -1, { seventeen: true, failure: true }],
    [18, 5, { seventeen: true, failure: true }],
    [12, 0, { seventeen: false, failure: false }],
  ])('evaluates failure for roll=%s margin=%s', (rtotal, margin, expected) => {
    expect(calcFailure(rtotal, margin)).toEqual(expected)
  })
})

describe('calcFinalTarget', () => {
  test.each([
    [10, 0, null, 10],
    [10, 3, null, 13],
    [10, -3, null, 7],
    [10, 5, 12, 12],
    [10, 5, 8, 8],
    [15, -4, 12, 11],
    [15, -2, 12, 12],
  ])('calculates final target for origin=%s modifier=%s max=%s', (origtarget, modifier, maxtarget, expected) => {
    expect(calcFinalTarget(origtarget, modifier, maxtarget)).toBe(expected)
  })
})

describe('detectCriticals', () => {
  test.each([
    [4, 10, { isCritSuccess: true, isCritFailure: false }],
    [5, 14, { isCritSuccess: false, isCritFailure: false }],
    [5, 15, { isCritSuccess: true, isCritFailure: false }],
    [6, 15, { isCritSuccess: false, isCritFailure: false }],
    [6, 16, { isCritSuccess: true, isCritFailure: false }],
    [17, 15, { isCritSuccess: false, isCritFailure: true }],
    [17, 18, { isCritSuccess: false, isCritFailure: false }],
    [18, 10, { isCritSuccess: false, isCritFailure: true }],
    [8, 1, { isCritSuccess: false, isCritFailure: false }],
    [20, 10, { isCritSuccess: false, isCritFailure: true }],
    [10, 1, { isCritSuccess: false, isCritFailure: false }],
  ])('detects critical outcome for roll=%s target=%s', (rtotal, finaltarget, expected) => {
    expect(detectCriticals(rtotal, finaltarget)).toEqual(expected)
  })

  test('treats a large negative margin as critical failure when final target is positive', () => {
    expect(detectCriticals(12, 1)).toEqual({ isCritSuccess: false, isCritFailure: true })
    expect(detectCriticals(12, 3)).toEqual({ isCritSuccess: false, isCritFailure: false })
  })
})
