// @ts-expect-error - test-only import; module resolution does not include plain JavaScript modules.
import { applyDiffuseInjuryLimit } from '../module/damage/injury-rules'

describe('Injury Tolerance (Diffuse)', () => {
  test('caps impaling and piercing injury at 1 HP', () => {
    expect(applyDiffuseInjuryLimit(8, 'imp', true)).toBe(1)
    expect(applyDiffuseInjuryLimit(8, 'pi+', true)).toBe(1)
  })

  test('caps other injury at 2 HP', () => {
    expect(applyDiffuseInjuryLimit(8, 'cut', true)).toBe(2)
    expect(applyDiffuseInjuryLimit(1, 'cr', true)).toBe(1)
  })

  test.each(['isAreaEffect', 'isCone', 'isExplosion'])('%s attacks cause normal injury', attackType => {
    expect(applyDiffuseInjuryLimit(8, 'imp', true, { [attackType]: true })).toBe(8)
    expect(applyDiffuseInjuryLimit(8, 'cut', true, { [attackType]: true })).toBe(8)
  })

  test('does not alter injury when the target is not Diffuse', () => {
    expect(applyDiffuseInjuryLimit(8, 'pi', false)).toBe(8)
  })
})
