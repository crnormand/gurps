import { isPostureOrManeuver } from '../../module/actor/modern/utils/effect.ts'

const mockEffect = (options: { statuses?: Set<string>; flagType?: string } = {}) =>
  ({
    statuses: options.statuses,
    flags: {
      gurps: options.flagType ? { effect: { type: options.flagType } } : undefined,
    },
  }) as unknown as ActiveEffect

describe('isPostureOrManeuver', () => {
  test('returns false for regular effects', () => {
    const effect = mockEffect()

    expect(isPostureOrManeuver(effect)).toBe(false)
  })

  test('returns true for maneuver effects', () => {
    const effect = mockEffect({ statuses: new Set(['maneuver']) })

    expect(isPostureOrManeuver(effect)).toBe(true)
  })

  test('returns true for posture effects', () => {
    const effect = mockEffect({ flagType: 'posture' })

    expect(isPostureOrManeuver(effect)).toBe(true)
  })

  test('returns false for non-maneuver statuses', () => {
    const effect = mockEffect({ statuses: new Set(['stunned', 'shocked']) })

    expect(isPostureOrManeuver(effect)).toBe(false)
  })

  test('returns false for non-posture flag types', () => {
    const effect = mockEffect({ flagType: 'condition' })

    expect(isPostureOrManeuver(effect)).toBe(false)
  })

  test('returns true when effect has multiple statuses including maneuver', () => {
    const effect = mockEffect({ statuses: new Set(['maneuver', 'aim', 'focused']) })

    expect(isPostureOrManeuver(effect)).toBe(true)
  })

  test('returns true when effect has both maneuver status and posture flag', () => {
    const effect = mockEffect({ statuses: new Set(['maneuver']), flagType: 'posture' })

    expect(isPostureOrManeuver(effect)).toBe(true)
  })
})
