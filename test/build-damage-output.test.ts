import { buildDamageOutputGCS } from '../module/utilities/import-utilities.ts'

describe('buildDamageOutput', () => {
  describe('when damage.st is not "thr" or "sw"', () => {
    test('should return calc.damage when available', () => {
      const weapon = {
        damage: { st: 'invalid' },
        calc: { damage: '2d+2 cr' },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('2d+2 cr')
    })

    test('should return empty string when calc.damage is not available', () => {
      const weapon = {
        damage: { st: 'invalid' },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('')
    })

    test('should return calc.damage when damage.st is missing', () => {
      const weapon = {
        damage: {},
        calc: { damage: '1d cr' },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('1d cr')
    })

    test('should return empty string when damage is missing', () => {
      const weapon = {}
      expect(buildDamageOutputGCS(weapon)).toBe('')
    })
  })

  describe('when damage.st is "thr" or "sw"', () => {
    test('should format thrust damage with positive modifier', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: '2',
          type: 'cut',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr+2 cut')
    })

    test('should format swing damage with positive modifier', () => {
      const weapon = {
        damage: {
          st: 'sw',
          base: '3',
          type: 'cr',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('sw+3 cr')
    })

    test('should format damage with negative modifier', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: '-1',
          type: 'imp',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr-1 imp')
    })

    test('should format damage with zero modifier', () => {
      const weapon = {
        damage: {
          st: 'sw',
          base: '0',
          type: 'cut',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('sw cut')
    })

    test('should handle missing base modifier (defaults to 0)', () => {
      const weapon = {
        damage: {
          st: 'thr',
          type: 'pi',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr pi')
    })

    test('should handle missing damage type', () => {
      const weapon = {
        damage: {
          st: 'sw',
          base: '1',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('sw+1 undefined')
    })

    test('should parse numeric strings correctly', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: '+5',
          type: 'cut',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr+5 cut')
    })

    test('should handle large positive modifiers', () => {
      const weapon = {
        damage: {
          st: 'sw',
          base: '10',
          type: 'cr',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('sw+10 cr')
    })

    test('should handle large negative modifiers', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: '-5',
          type: 'imp',
        },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr-5 imp')
    })

    test('should handle different damage types', () => {
      const damageTypes = ['cut', 'cr', 'imp', 'pi', 'pi+', 'pi++', 'pi-', 'burn', 'cor', 'fat', 'tox']
      damageTypes.forEach(type => {
        const weapon = {
          damage: {
            st: 'thr',
            base: '1',
            type: type,
          },
        }
        expect(buildDamageOutputGCS(weapon)).toBe(`thr+1 ${type}`)
      })
    })
  })

  describe('edge cases', () => {
    test('should handle null weapon', () => {
      expect(buildDamageOutputGCS(null)).toBe('')
    })

    test('should handle undefined weapon', () => {
      expect(buildDamageOutputGCS(undefined)).toBe('')
    })

    test('should handle empty weapon object', () => {
      expect(buildDamageOutputGCS({})).toBe('')
    })

    test('should handle NaN base value', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: 'not-a-number',
          type: 'cut',
        },
        calc: { damage: '1d cut' },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('1d cut')
    })

    test('should prioritize damage.st over calc.damage when st is valid', () => {
      const weapon = {
        damage: {
          st: 'thr',
          base: '2',
          type: 'cut',
        },
        calc: { damage: '3d+1 cr' },
      }
      expect(buildDamageOutputGCS(weapon)).toBe('thr+2 cut')
    })
  })
})
