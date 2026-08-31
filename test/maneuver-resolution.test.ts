import { jest } from '@jest/globals'
import Maneuvers from '../module/combat/maneuver.js'
import { SETTING_USE_ON_TARGET } from '../module/combat/types.js'

/**
 * Point `game.settings.get` at the world setting maneuver resolution reads. Each test states its own
 * value so the whole setup is visible next to the assertion.
 */
const worldSettings = ({ onTarget = false } = {}) => {
  ;(globalThis as any).game.settings = {
    get: (_namespace: string, key: string) => {
      if (key === SETTING_USE_ON_TARGET) return onTarget
      return null
    },
  }
}

describe('Maneuvers.getManeuver', () => {
  it('returns the data of a maneuver from a source book in use', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver('aoa_strong').flags.gurps.name).toBe('aoa_strong')
  })

  it('returns the data of a maneuver whose source book is no longer in use', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver('committed_aim').flags.gurps.name).toBe('committed_aim')
  })

  it('returns the On Target data for Aim when On Target is in use', () => {
    worldSettings({ onTarget: true })

    expect(Maneuvers.getManeuver('aim').flags.gurps.move).toBe('half')
  })

  it('returns the Basic Set data for Aim when On Target is not in use', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver('aim').flags.gurps.move).toBe('step')
  })

  it('returns Do Nothing for a name it does not recognize', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver('sudden_naptime').flags.gurps.name).toBe('do_nothing')
  })

  test('the maneuver name is the string "undefined"', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver('undefined').flags.gurps.name).toBe('do_nothing')
  })

  test('the maneuver name is null', () => {
    worldSettings({ onTarget: false })

    // The callers are untyped JS, so null reaches this in a way the signature says it can't.
    expect(Maneuvers.getManeuver(null as any).flags.gurps.name).toBe('do_nothing')
  })

  test('no maneuver name is given', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getManeuver().flags.gurps.name).toBe('do_nothing')
  })
})

describe('Maneuvers.getManeuver warnings', () => {
  it('warns that the maneuver name was not recognized', () => {
    worldSettings({ onTarget: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    Maneuvers.getManeuver('sudden_naptime')

    expect(warn).toHaveBeenCalledWith('GURPS | Unrecognized maneuver "sudden_naptime", falling back to Do Nothing')
    warn.mockRestore()
  })

  test('the maneuver comes from a source book no longer in use', () => {
    worldSettings({ onTarget: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    Maneuvers.getManeuver('committed_aim')

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('no maneuver name is given', () => {
    worldSettings({ onTarget: false })
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    Maneuvers.getManeuver()

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('Maneuvers.getIcon', () => {
  it('returns the icon of a maneuver whose source book is no longer in use', () => {
    worldSettings({ onTarget: false })

    expect(Maneuvers.getIcon('committed_aim')).toBe('systems/gurps/icons/maneuvers/man-aim.png')
  })
})
