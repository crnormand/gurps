import * as utilities from '../lib/utilities.js'
import { displayMod, makeSelect } from '../lib/utilities.js'

describe('utilities', () => {
  describe('displayMod', () => {
    test('should return "+0" for null or undefined input', () => {
      expect(displayMod(null)).toBe('+0')
      expect(displayMod(undefined)).toBe('+0')
    })

    test('should return "+0" for empty string input', () => {
      expect(displayMod('')).toBe('+0')
    })

    test('should add "+" to positive numbers', () => {
      expect(displayMod(5)).toBe('+5')
      expect(displayMod('5')).toBe('+5')
    })

    test('should keep "-" for negative numbers', () => {
      expect(displayMod(-5)).toBe('-5')
      expect(displayMod('-5')).toBe('-5')
    })
  })

  describe('makeSelect', () => {
    test('should create a select structure from an array', () => {
      const array = ['Title', '*Group1', 'Option1', 'Option2', '*Group2', 'Option3']
      const result = makeSelect(array)
      expect(result).toEqual({
        title: 'Title',
        groups: [
          { group: 'Group1', options: ['Option1', 'Option2'] },
          { group: 'Group2', options: ['Option3'] },
        ],
      })
    })
  })

  describe('horiz', () => {
    test('should return a div with the given text', () => {
      const text = 'Sample Text'
      const result = utilities.horiz(text)
      expect(result).toBe("<div class='subtitle'>Sample Text</div>")
    })
  })

  describe('xmlTextToJson', () => {
    test.skip('should convert XML text to JSON', () => {
      const xmlText = '<root><child>value</child></root>'
      const result = utilities.xmlTextToJson(xmlText)
      expect(result).toEqual({ root: { child: 'value' } })
    })
  })

  describe('d6ify', () => {
    test('should replace "d" with "d6"', () => {
      expect(utilities.d6ify('2d')).toBe('2d6')
      expect(utilities.d6ify('3d+2')).toBe('3d6+2')
    })
  })

  describe('isNiceDiceEnabled', () => {
    test('should return false if Dice So Nice is not enabled', () => {
      expect(utilities.isNiceDiceEnabled()).toBe(false)
    })
  })

  describe('parseIntFrom', () => {
    test('should parse integer from string', () => {
      expect(utilities.parseIntFrom('42', 0)).toBe(42)
    })

    test('should return default value for invalid input', () => {
      expect(utilities.parseIntFrom(null, 0)).toBe(0)
      expect(utilities.parseIntFrom('invalid', 0)).toBe(0)
    })
  })

  describe('parseFloatFrom', () => {
    test('should parse float from string', () => {
      expect(utilities.parseFloatFrom('42.42', 0)).toBe(42.42)
    })

    test('should return default value for invalid input', () => {
      expect(utilities.parseFloatFrom(null, 0)).toBe(0)
      expect(utilities.parseFloatFrom('invalid', 0)).toBe(0)
    })
  })

  describe('isEmpty', () => {
    test('should return true for empty values', () => {
      expect(utilities.isEmpty(null)).toBe(true)
      expect(utilities.isEmpty(undefined)).toBe(true)
      expect(utilities.isEmpty('')).toBe(true)
      expect(utilities.isEmpty([])).toBe(true)
    })

    test('should return false for non-empty values', () => {
      expect(utilities.isEmpty('value')).toBe(false)
      expect(utilities.isEmpty([1, 2, 3])).toBe(false)
    })
  })

  describe('isEmptyObject', () => {
    test('should return true for empty objects', () => {
      expect(utilities.isEmptyObject({})).toBe(true)
    })

    test('should return false for non-empty objects', () => {
      expect(utilities.isEmptyObject({ key: 'value' })).toBe(false)
    })
  })

  describe('zeroFill', () => {
    test('should pad number with leading zeros', () => {
      expect(utilities.zeroFill(42, 5)).toBe('00042')
    })
  })

  describe('convertRollStringToArrayOfInt', () => {
    test('should convert roll string to array of integers', () => {
      expect(utilities.convertRollStringToArrayOfInt('2-5')).toEqual([2, 3, 4, 5])
    })

    test('should return empty array for invalid input', () => {
      expect(utilities.convertRollStringToArrayOfInt('invalid')).toEqual([])
    })
  })

  describe('generateUniqueId', () => {
    test.skip('should generate a unique ID', () => {
      const id1 = utilities.generateUniqueId()
      const id2 = utilities.generateUniqueId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('atou and utoa', () => {
    test('should encode and decode base64 strings', () => {
      const original = 'Hello, World!'
      const encoded = utilities.utoa(original)
      const decoded = utilities.atou(encoded)
      expect(decoded).toBe(original)
    })
  })

  describe('arrayToObject', () => {
    test('should convert array to object', () => {
      const array = ['a', 'b', 'c']
      const result = utilities.arrayToObject(array, 2)
      expect(result).toEqual({ '00': 'a', '01': 'b', '02': 'c' })
    })
  })

  describe('objectToArray', () => {
    test('should convert object to array', () => {
      const object = { '00': 'a', '01': 'b', '02': 'c' }
      const result = utilities.objectToArray(object)
      expect(result).toEqual(['a', 'b', 'c'])
    })
  })

  describe('assert', () => {
    test('should throw an error if condition is false', () => {
      expect(() => utilities.assert(false, 'Error message')).toThrow('Error message')
    })

    test('should not throw an error if condition is true', () => {
      expect(() => utilities.assert(true, 'Error message')).not.toThrow()
    })
  })

  describe('getOperation', () => {
    test('should return correct operation function', () => {
      expect(utilities.getOperation('+')(1, 2)).toBe(3)
      expect(utilities.getOperation('×')(2, 3)).toBe(6)
      expect(utilities.getOperation('÷')(6, 2)).toBe(3)
      expect(utilities.getOperation('−')(5, 3)).toBe(2)
    })
  })

  describe('getComparison', () => {
    test('should return correct comparison function', () => {
      expect(utilities.getComparison('>')(3, 2)).toBe(true)
      expect(utilities.getComparison('≥')(3, 3)).toBe(true)
      expect(utilities.getComparison('≤')(2, 3)).toBe(true)
    })
  })

  describe('splitArgs', () => {
    test('should split arguments correctly', () => {
      expect(utilities.splitArgs('arg1 arg2 "arg 3"')).toEqual(['arg1', 'arg2', 'arg 3'])
    })

    test('quoted arguments should be returned as is', () => {
      expect(utilities.splitArgs('arg1 "arg 2"')).toEqual(['arg1', 'arg 2'])
    })
  })

  describe('diceToFormula', () => {
    test('should convert dice object to formula string', () => {
      const dice = { dice: 2, adds: -1 }
      expect(utilities.diceToFormula(dice, '[flavor]')).toBe('2d6[flavor]-1')
    })
  })

  describe('makeRegexPatternFrom', () => {
    test('should create regex pattern from string', () => {
      expect(utilities.makeRegexPatternFrom('test*')).toBe('^test.*?$')
    })
  })

  describe('locateToken', () => {
    beforeAll(() => {
      // @ts-expect-error: global.canvas is used for testing purposes
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      global.canvas = {
        tokens: {
          placeables: [
            { id: 'token1', name: 'Token One', actor: { id: 'actor1', name: 'Actor One' } },
            { id: 'token2', name: 'Token Two', actor: { id: 'actor2', name: 'Actor Two' } },
          ],
        },
      }
    })

    test('should locate token by ID', () => {
      const result = utilities.locateToken('token1')
      expect(result).toEqual([{ id: 'token1', name: 'Token One', actor: { id: 'actor1', name: 'Actor One' } }])
    })

    test('should locate token by actor ID', () => {
      const result = utilities.locateToken('actor2')
      expect(result).toEqual([{ id: 'token2', name: 'Token Two', actor: { id: 'actor2', name: 'Actor Two' } }])
    })

    test('should locate token by name', () => {
      const result = utilities.locateToken('Token One')
      expect(result).toEqual([{ id: 'token1', name: 'Token One', actor: { id: 'actor1', name: 'Actor One' } }])
    })

    test('should locate token by actor name', () => {
      const result = utilities.locateToken('Actor Two')
      expect(result).toEqual([{ id: 'token2', name: 'Token Two', actor: { id: 'actor2', name: 'Actor Two' } }])
    })
  })

  describe('sanitize', () => {
    test('should sanitize string for parsing', () => {
      const input = 'Hello &amp; World &minus; &plus; &times; <b>bold</b>'
      const output = 'Hello & World - + x bold'
      expect(utilities.sanitize(input)).toBe(output)
    })
  })

  describe('wait', () => {
    test('should wait for specified time', async () => {
      const start = Date.now()
      await utilities.wait(100)
      const end = Date.now()
      expect(end - start).toBeGreaterThanOrEqual(100)
    })
  })

  describe('makeElementDraggable', () => {
    test.skip('should make element draggable', () => {
      const element = document.createElement('div')
      utilities.makeElementDraggable(element, 'type', 'cssClass', { data: 'payload' }, undefined, [0, 0])
      expect(element.getAttribute('draggable')).toBe('true')
    })
  })

  describe('arrayBuffertoBase64', () => {
    test('should convert array buffer to base64 string', () => {
      const buffer = new TextEncoder().encode('Hello, World!')
      const result = utilities.arrayBuffertoBase64(buffer)
      expect(result).toBe('Hello, World!')
    })
  })

  describe('quotedAttackName', () => {
    test('should return quoted attack name', () => {
      const item = { name: 'Attack', mode: 'Mode' }
      expect(utilities.quotedAttackName(item)).toBe(`"Attack (Mode)"`)
    })

    test('should return quoted attack name without mode', () => {
      const item = { name: 'Attack' }
      expect(utilities.quotedAttackName(item)).toBe(`"Attack"`)
    })

    test('should handle quoted item name', () => {
      const item = { name: 'Sword "Saethors Bane"' }
      expect(utilities.quotedAttackName(item)).toBe(`'Sword "Saethors Bane"'`)
    })

    test('should handle single quotes in item name', () => {
      const item = { name: "Sword 'Saethors Bane'" }
      expect(utilities.quotedAttackName(item)).toBe(`"Sword 'Saethors Bane'"`)
    })

    test('should handle mixed quotes in item name', () => {
      const item = { name: `Sword "Saethor's Bane"` }
      expect(utilities.quotedAttackName(item)).toBe(`'Sword "Saethor\\'s Bane"'`)
    })

    test('Dashes in Ranged Weapon names used as Modifiers', () => {
      const item = { name: `AK-98` }
      expect(utilities.quotedAttackName(item)).toBe(`"AK-98"`)
    })
  })

  describe('arraysEqual', () => {
    test('should return true for equal arrays', () => {
      expect(utilities.arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    test('should return false for unequal arrays', () => {
      expect(utilities.arraysEqual([1, 2, 3], [1, 2, 4])).toBe(false)
    })
  })

  describe('compareColleges', () => {
    test('should return true for equal college lists', () => {
      expect(utilities.compareColleges(['Fire', 'Water'], 'Fire,Water')).toBe(true)
    })

    test('should return false for unequal college lists', () => {
      expect(utilities.compareColleges(['Fire', 'Water'], 'Fire,Earth')).toBe(false)
    })
  })

  describe('escapeHtml', () => {
    test('should escape HTML characters', () => {
      expect(utilities.escapeHtml('<div>')).toBe('&lt;div&gt;')
    })
  })

  describe('stripBracketContents', () => {
    test('returns empty string for null or undefined', () => {
      expect(utilities.stripBracketContents(null)).toBe('')
      expect(utilities.stripBracketContents(undefined)).toBe('')
      expect(utilities.stripBracketContents('')).toBe('')
    })

    test('removes single OTF bracket', () => {
      expect(utilities.stripBracketContents('Attack [HT]')).toBe('Attack')
      expect(utilities.stripBracketContents('[HT] Attack')).toBe('Attack')
      expect(utilities.stripBracketContents('Do [HT] now')).toBe('Do now')
    })

    test('removes multiple OTF brackets', () => {
      expect(utilities.stripBracketContents('Foo [HT] bar [Will] baz')).toBe('Foo bar baz')
      expect(utilities.stripBracketContents('[HT] and [Will]')).toBe('and')
    })

    test('handles complex OTF formulas', () => {
      expect(utilities.stripBracketContents('Shadow Step [IQ-10 *Costs 1 FP]')).toBe('Shadow Step')
      expect(utilities.stripBracketContents('[Sk:"Stealth"-2] sneaking')).toBe('sneaking')
    })

    test('collapses multiple spaces', () => {
      expect(utilities.stripBracketContents('Foo  [HT]  bar')).toBe('Foo bar')
      expect(utilities.stripBracketContents('Multiple   spaces')).toBe('Multiple spaces')
    })

    test('trims whitespace', () => {
      expect(utilities.stripBracketContents('  [HT] Attack  ')).toBe('Attack')
      expect(utilities.stripBracketContents('[HT]')).toBe('')
    })

    test('handles text without brackets', () => {
      expect(utilities.stripBracketContents('No brackets here')).toBe('No brackets here')
    })

    test('handles nested-looking content correctly', () => {
      expect(utilities.stripBracketContents('Text [outer [inner] still] more')).toBe('Text still] more')
    })
  })
})
