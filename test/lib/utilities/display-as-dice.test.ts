import { displayAsDice } from '@util/utilities.js'

describe('displayAsDice', () => {
  let system: any

  beforeEach(() => {
    system = {
      swing: '3d+2',
      thrust: '2d+1',
    }
  })

  describe('non-swing/thrust values', () => {
    test('should return value as string for regular values', () => {
      expect(displayAsDice('3d+2', system)).toBe('3d+2')
      expect(displayAsDice('2d6', system)).toBe('2d6')
      expect(displayAsDice('1d-1', system)).toBe('1d-1')
    })

    test('should handle numeric input', () => {
      expect(displayAsDice(5, system)).toBe('5')
      expect(displayAsDice(10, system)).toBe('10')
    })

    test('should handle empty/null-like values', () => {
      expect(displayAsDice('', system)).toBe('')
      expect(displayAsDice('0', system)).toBe('0')
    })
  })

  describe('swing expressions', () => {
    test('should convert "sw" to swing damage with addition', () => {
      // swing is "3d+2", formula adds "+1", result should be 3d+3
      expect(displayAsDice('sw+1 imp', system)).toBe('3d+3 imp')
    })

    test('should convert "sw" to swing damage with subtraction', () => {
      // swing is "3d+2", formula subtracts "-1", result should be 3d+1
      expect(displayAsDice('sw-1(2) cut', system)).toBe('3d+1(2) cut')
    })

    test('should handle sw with no modifier', () => {
      // swing is "3d+2", no formula add, result should be 3d+2
      expect(displayAsDice('sw(0.5)x2 pi++', system)).toBe('3d+2(0.5)x2 pi++')
    })

    test('should handle "SW" uppercase', () => {
      expect(displayAsDice('SW+2', system)).toBe('3d+4')
    })

    test('should preserve multipliers and other modifiers', () => {
      // swing is "3d+2", formula "+1x2" -> adds +1 to dice, keeps x2
      expect(displayAsDice('sw+1x2', system)).toBe('3d+3x2')
    })

    test('should handle swing with large positive modifier', () => {
      expect(displayAsDice('sw+5', system)).toBe('3d+7')
    })

    test('should handle swing with negative modifier resulting in negative add', () => {
      // swing is "3d+2", formula "-3", result should be 3d-1
      expect(displayAsDice('sw-3', system)).toBe('3d-1')
    })
  })

  describe('thrust expressions', () => {
    test('should convert "thr" to thrust damage with addition', () => {
      // thrust is "2d+1", formula adds "+1", result should be 2d+2
      expect(displayAsDice('thr+1', system)).toBe('2d+2')
    })

    test('should convert "thr" to thrust damage with subtraction', () => {
      // thrust is "2d+1", formula subtracts "-1", result should be 2d+0
      expect(displayAsDice('thr-1', system)).toBe('2d')
    })

    test('should handle "thr" with no modifier', () => {
      expect(displayAsDice('thr', system)).toBe('2d+1')
    })

    test('should handle "THR" uppercase', () => {
      expect(displayAsDice('THR+2', system)).toBe('2d+3')
    })

    test('should preserve multipliers for thrust', () => {
      expect(displayAsDice('thr+1x3', system)).toBe('2d+2x3')
    })
  })

  describe('complex modifiers', () => {
    test('should handle multiplier without add', () => {
      expect(displayAsDice('swx2', system)).toBe('3d+2x2')
    })

    test('should handle negative thrust resulting in zero modifier', () => {
      // thrust is "2d+1", formula "-1", result should be 2d with no modifier
      expect(displayAsDice('thr-1', system)).toBe('2d')
    })

    test('should handle swing with multiple modifiers', () => {
      // sw+1x2 should add +1 to swing and keep x2
      expect(displayAsDice('sw+1x2', system)).toBe('3d+3x2')
    })
  })

  describe('edge cases', () => {
    test('should handle actor with different damage values', () => {
      system.swing = '4d'
      system.thrust = '3d-1'

      expect(displayAsDice('sw+1', system)).toBe('4d+1')
      expect(displayAsDice('thr+2', system)).toBe('3d+1')
    })

    test('should handle swing/thrust without space and operator together', () => {
      expect(displayAsDice('sw+0', system)).toBe('3d+2')
      expect(displayAsDice('thr+0', system)).toBe('2d+1')
    })

    test('should handle mixed case prefixes', () => {
      expect(displayAsDice('Sw+1', system)).toBe('3d+3')
      expect(displayAsDice('Thr+1', system)).toBe('2d+2')
    })
  })
})
