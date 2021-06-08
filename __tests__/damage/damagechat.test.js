import DamageChat from '../../module/damage/damagechat.js'
import { describe, expect, test } from '@jest/globals'
import { jest } from '@jest/globals'

describe('DamageChat', () => {
  let chat = new DamageChat({ generateUniqueId: () => 42 })

  afterEach(() => jest.resetAllMocks())

  test('has constructor', () => {
    expect(chat).not.toBeNull()
  })

  describe('_getDiceData', () => {
    let warn = jest.fn()
    global.ui = {
      notifications: {
        warn: warn,
      },
    }

    describe('formula', () => {
      test('dice plus mods', () => {
        expect(chat._getDiceData('1d', null, []).formula).toBe('1d6')
        expect(chat._getDiceData('3d+1', null, []).formula).toBe('3d6+1')
        expect(chat._getDiceData('2d-2', null, []).formula).toBe('2d6-2')
        expect(chat._getDiceData('1d6', null, []).formula).toBe('1d6')
      })

      test('dice plus mods plus mods', () => {
        expect(chat._getDiceData('3d+1-2', null, []).formula).toBe('3d6+1-2')
        expect(chat._getDiceData('2d-2+3', null, []).formula).toBe('2d6-2+3')
      })

      test('multipliers', () => {
        expect(chat._getDiceData('1dx5', null, []).formula).toBe('1d6')
        expect(chat._getDiceData('3d*1', null, []).formula).toBe('3d6')
        expect(chat._getDiceData('2d×2', null, []).formula).toBe('2d6')
        expect(chat._getDiceData('1d6X3', null, []).formula).toBe('1d6')
      })

      test('mods plus multipliers', () => {
        expect(chat._getDiceData('1d+2x5', null, []).formula).toBe('1d6+2')
        expect(chat._getDiceData('3d-2+5*1', null, []).formula).toBe('3d6-2+5')
      })

      test('armor divisors', () => {
        expect(chat._getDiceData('1d(2)', null, []).formula).toBe('1d6')
        expect(chat._getDiceData('3d(0.2)', null, []).formula).toBe('3d6')
      })

      test('mods plus armor divisors', () => {
        expect(chat._getDiceData('1d+3(2)', null, []).formula).toBe('1d6+3')
        expect(chat._getDiceData('3d-3+1(0.2)', null, []).formula).toBe('3d6-3+1')
      })

      test('mods plus multipliers plus armor divisors', () => {
        expect(chat._getDiceData('1d+3x4(2)', null, []).formula).toBe('1d6+3')
        expect(chat._getDiceData('3d-3+1*5(0.2)', null, []).formula).toBe('3d6-3+1')
      })

      test('bad dice text', () => {
        expect(chat._getDiceData('d+1', null, [])).toBeNull()
        expect(warn.mock.calls[0][0]).toBe('Invalid Dice formula: "d+1"')

        expect(chat._getDiceData('-2', null, [])).toBeNull()
        expect(warn.mock.calls[1][0]).toBe('Invalid Dice formula: "-2"')
      })

      test('ignored text', () => {
        expect(chat._getDiceData('1d+a', null, []).formula).toBe('1d6')
        expect(chat._getDiceData('1d-a', null, []).formula).toBe('1d6')
      })
    })

    describe('multiplier', () => {
      test('missing multiplier should be 1', () => {
        expect(chat._getDiceData('1d', null, []).multiplier).toBe(1)
        expect(chat._getDiceData('2d-2+3', null, []).multiplier).toBe(1)
      })

      test('parse multiplier in dicetext', () => {
        expect(chat._getDiceData('1dx5', null, []).multiplier).toBe(5)
        expect(chat._getDiceData('2d-2+3X3', null, []).multiplier).toBe(3)
        expect(chat._getDiceData('1d-4*2', null, []).multiplier).toBe(2)
        expect(chat._getDiceData('2d-2+3x3', null, []).multiplier).toBe(3)
        expect(chat._getDiceData('3d-3+1*5(0.2)', null, []).multiplier).toBe(5)
      })
    })

    describe('divisor', () => {
      test('missing divisor should be 0', () => {
        // TODO maybe it should be one?
        expect(chat._getDiceData('1d+3', null, []).divisor).toBe(0)
        expect(chat._getDiceData('1d+3x4', null, []).divisor).toBe(0)
      })

      test('parse divisor in dicetext', () => {
        expect(chat._getDiceData('1d+3(2)', null, []).divisor).toBe(2)
        expect(chat._getDiceData('3d-3+1(0.2)', null, []).divisor).toBe(0.2)
        expect(chat._getDiceData('1d+3x4(3)', null, []).divisor).toBe(3)
        expect(chat._getDiceData('3d-3+1*5(0.5)', null, []).divisor).toBe(0.5)
        // -1 AD is "infinite"
        expect(chat._getDiceData('3d-3+1*5(-1)', null, []).divisor).toBe(-1)
      })
    })

    test('adds', () => {
      expect(chat._getDiceData('1dx5', null, []).adds1).toBe(0)
      expect(chat._getDiceData('1dx5', null, []).adds2).toBe(0)
      expect(chat._getDiceData('1d+3(2)', null, []).adds1).toBe(3)
      expect(chat._getDiceData('1d+3(2)', null, []).adds2).toBe(0)
      expect(chat._getDiceData('3d-3+1*5(0.2)', null, []).adds1).toBe(-3)
      expect(chat._getDiceData('3d-3+1*5(0.2)', null, []).adds2).toBe(1)
    })

    describe('min', () => {
      test('default is 1', () => {
        expect(chat._getDiceData('1d', null, []).min).toBe(1)
      })

      test('for cr, min is 0', () => {
        expect(chat._getDiceData('1d', 'cr', []).min).toBe(0)
      })

      test('any other damage type, min is 1', () => {
        expect(chat._getDiceData('1d', 'burn', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'cut', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'fat', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'imp', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'pi-', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'pi', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'pi+', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'pi++', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'cor', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'tox', []).min).toBe(1)
        expect(chat._getDiceData('1d', 'dmg', []).min).toBe(1)
      })

      test('cr with ! min is 1', () => {
        expect(chat._getDiceData('1d!', 'cr', []).min).toBe(1)
      })
    })

    describe('damageType', () => {
      test('default is dmg', () => {
        expect(chat._getDiceData('1d', null, []).damageType).toBe('dmg')
        expect(chat._getDiceData('1d', '', []).damageType).toBe('dmg')
      })

      test('if specified, just pass it through', () => {
        expect(chat._getDiceData('1d', 'cr', []).damageType).toBe('cr')
        expect(chat._getDiceData('1d', 'burn', []).damageType).toBe('burn')
        expect(chat._getDiceData('1d', 'cut', []).damageType).toBe('cut')
        expect(chat._getDiceData('1d', 'fat', []).damageType).toBe('fat')
        expect(chat._getDiceData('1d', 'imp', []).damageType).toBe('imp')
        expect(chat._getDiceData('1d', 'pi-', []).damageType).toBe('pi-')
        expect(chat._getDiceData('1d', 'pi', []).damageType).toBe('pi')
        expect(chat._getDiceData('1d', 'pi+', []).damageType).toBe('pi+')
        expect(chat._getDiceData('1d', 'pi++', []).damageType).toBe('pi++')
        expect(chat._getDiceData('1d', 'cor', []).damageType).toBe('cor')
        expect(chat._getDiceData('1d', 'tox', []).damageType).toBe('tox')
        expect(chat._getDiceData('1d', 'dmg', []).damageType).toBe('dmg')
      })
    })

    describe('verb', () => {
      test('specifying a die roll sets "rolled"', () => {
        expect(chat._getDiceData('1d', 'dmg', []).rolled).toBe(true)
        expect(chat._getDiceData('2d-2+3', null, []).rolled).toBe(true)
        expect(chat._getDiceData('3d-3+1*5(-1)', null, []).rolled).toBe(true)
      })

      test('Just specifying an amount leaves verb blank', () => {
        expect(chat._getDiceData('21', 'dmg', []).rolled).toBe(false)
      })
    })

    test('diceText', () => {
      expect(chat._getDiceData('1d', 'dmg', []).diceText).toBe('1d')
      expect(chat._getDiceData('2d-2+3', null, []).diceText).toBe('2d-2+3')
      expect(chat._getDiceData('3d-3+1*5(-1)', null, []).diceText).toBe('3d-3+1×5 (-1)')
      expect(chat._getDiceData('3d+1x2', null, []).diceText).toBe('3d+1×2')
      expect(chat._getDiceData('3d-3X3 (2)', null, []).diceText).toBe('3d-3×3 (2)')
      expect(chat._getDiceData('3d-3×3(0.2)', null, []).diceText).toBe('3d-3×3 (0.2)')
    })

    test('overrideText replace diceText', () => {
      expect(chat._getDiceData('2d-2+3', null, [], 'Bar').diceText).toBe('Bar')
      expect(chat._getDiceData('3d-3+1*5(-1)', null, [], 'Foo').diceText).toBe('Foo×5 (-1)')
    })

    test('modifier is set to the sum of modints', () => {
      expect(chat._getDiceData('1d', 'dmg', []).modifier).toBe(0)
      expect(chat._getDiceData('1d', 'dmg', [{ modint: 2 }]).modifier).toBe(2)
      expect(chat._getDiceData('1d', 'dmg', [{ modint: 2 }, { modint: -4 }]).modifier).toBe(-2)
      expect(chat._getDiceData('1d', 'dmg', [{ modint: 2 }, { modint: 3 }, { modint: 4 }]).modifier).toBe(9)
    })

    // test.skip('diceText with a minus (#8722) instead of a dash (-)', () => {
    //   expect(chat._getDiceData('2d−2', null, []).formula).toBe('2d6-2')
    // })
  })

  describe('_createDraggableSection', () => {
    let create = jest.fn()
    let results = jest.fn()

    test('id is set to unique ID', () => {
      // create mocks
      create.mockReturnValueOnce({ evaluate: () => {}, result: '4', dice: [{ results: [] }] })
      global.Roll = { create: create }

      let diceData = { formula: '1d6' }

      return chat._createDraggableSection({ _id: 69 }, diceData, null, []).then(data => {
        expect(data).not.toBeNull()
      })
    })
  })
})
