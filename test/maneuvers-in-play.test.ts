import Maneuvers from '../module/combat/maneuver.js'
import { SETTING_COMBAT_OPTIONS, SETTING_USE_ON_TARGET } from '../module/combat/types.js'

/**
 * Point `game.settings.get` at the two world settings the in-play maneuver list reads. Each test
 * states its own values so the whole setup is visible next to the assertion.
 */
const worldSettings = ({ onTarget = false, combatOptions = {} } = {}) => {
  ;(globalThis as any).game.settings = {
    get: (_namespace: string, key: string) => {
      if (key === SETTING_USE_ON_TARGET) return onTarget
      if (key === SETTING_COMBAT_OPTIONS) return combatOptions
      return null
    },
  }
}

describe('Maneuvers.getAllInPlay', () => {
  it('includes a maneuver the GM has left alone', () => {
    worldSettings({ combatOptions: { maneuvers: {} } })

    expect(Object.keys(Maneuvers.getAllInPlay())).toContain('aoa_strong')
  })

  it('omits a maneuver the GM has turned off', () => {
    worldSettings({ combatOptions: { maneuvers: { aoa_strong: false } } })

    expect(Object.keys(Maneuvers.getAllInPlay())).not.toContain('aoa_strong')
  })

  it('leaves the other maneuvers alone when one is turned off', () => {
    worldSettings({ combatOptions: { maneuvers: { aoa_strong: false } } })

    expect(Object.keys(Maneuvers.getAllInPlay())).toContain('aoa_determined')
  })

  test('Do Nothing has been turned off in the settings', () => {
    worldSettings({ combatOptions: { maneuvers: { do_nothing: false } } })

    expect(Object.keys(Maneuvers.getAllInPlay())).toContain('do_nothing')
  })

  test('On Target is off', () => {
    worldSettings({ onTarget: false, combatOptions: { maneuvers: {} } })

    expect(Object.keys(Maneuvers.getAllInPlay())).not.toContain('committed_aim')
  })

  test('On Target is on', () => {
    worldSettings({ onTarget: true, combatOptions: { maneuvers: {} } })

    expect(Object.keys(Maneuvers.getAllInPlay())).toContain('committed_aim')
  })
})

describe('Maneuvers.getAllInPlayData', () => {
  it('omits a maneuver the GM has turned off', () => {
    worldSettings({ combatOptions: { maneuvers: { aoa_strong: false } } })

    expect(Object.keys(Maneuvers.getAllInPlayData())).not.toContain('aoa_strong')
  })

  it('keeps the maneuver named by `keep` even though it is turned off', () => {
    worldSettings({ combatOptions: { maneuvers: { aoa_strong: false } } })

    expect(Object.keys(Maneuvers.getAllInPlayData('aoa_strong'))).toContain('aoa_strong')
  })

  it('keeps the maneuver named by `keep` even though On Target has been turned off', () => {
    worldSettings({ onTarget: false, combatOptions: { maneuvers: {} } })

    expect(Object.keys(Maneuvers.getAllInPlayData('committed_aim'))).toContain('committed_aim')
  })

  it('returns the maneuver data rather than the Maneuver instance', () => {
    worldSettings({ combatOptions: { maneuvers: {} } })

    expect(Maneuvers.getAllInPlayData().aoa_strong.img).toBe('systems/gurps/icons/maneuvers/man-aoa-strong.png')
  })
})
