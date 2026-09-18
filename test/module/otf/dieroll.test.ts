import { calcFailure, calcFinalTarget, calculateMessageMode, detectCriticals } from '@module/otf/dieroll.js'
import { MessageMode } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

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
