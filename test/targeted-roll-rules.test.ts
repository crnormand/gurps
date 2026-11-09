// @ts-expect-error - test-only import; module resolution does not include plain JavaScript modules.
import { isCriticalFailure } from '../module/combat/targeted-roll-rules'

describe('GURPS targeted critical failure rules', () => {
  test('a margin of failure of 10 is critical for melee attacks', () => {
    expect(isCriticalFailure(15, 5, false)).toBe(true)
  })

  test('a margin of failure of 10 is not critical for ranged attacks', () => {
    expect(isCriticalFailure(15, 5, true)).toBe(false)
  })

  test('an 18 is always a critical failure, including ranged attacks', () => {
    expect(isCriticalFailure(18, 20, true)).toBe(true)
  })

  test('a 17 is critical only when effective target is 15 or less', () => {
    expect(isCriticalFailure(17, 15, true)).toBe(true)
    expect(isCriticalFailure(17, 16, true)).toBe(false)
  })
})
