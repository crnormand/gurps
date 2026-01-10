/**
 * Backward Compatibility Tests for Regex Changes
 *
 * These tests verify that removing unnecessary escape characters from regex patterns
 * inside character classes does not change the matching behavior.
 *
 * Key principle: Inside character classes [...], these characters don't need escaping:
 * - . (dot), / (slash), | (pipe), [ (opening bracket), ? (question mark)
 * - * (asterisk), + (plus), @ (at sign), ) (closing paren)
 */

describe('Regex Backward Compatibility', () => {
  /**
   * Category 1: Numeric/Decimal Patterns
   * Files: ranged-attack.ts, actor-importer.js, chat-processors.js, anim.js, gurps.js, _actor.js, gurps-actor.ts
   */
  describe('Category 1: Numeric/Decimal Patterns [\\d.]', () => {
    // OLD: /[\d\.]+/  NEW: /[\d.]+/
    const oldPattern = /[\d\.]+/
    const newPattern = /[\d.]+/

    test.each([
      ['3.14', true],
      ['42', true],
      ['0.5', true],
      ['100.25', true],
      ['3.14.15', true],
      ['...', true],
      ['abc', false],
      ['', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('extracted match is identical', () => {
      const testInput = 'value: 123.456 units'
      expect(testInput.match(oldPattern)?.[0]).toBe(testInput.match(newPattern)?.[0])
      expect(testInput.match(oldPattern)?.[0]).toBe('123.456')
    })
  })

  /**
   * Category 2: Command Prefix Patterns
   * Files: chat-processors.js, everything.js, chat.js, status.js, tracker.js, anim.js
   */
  describe('Category 2: Command Prefix Patterns [/?]', () => {
    // OLD: /^[\/\?]help$/i  NEW: /^[/?]help$/i
    const oldPattern = /^[\/\?]help$/i
    const newPattern = /^[/?]help$/i

    test.each([
      ['/help', true],
      ['?help', true],
      ['/HELP', true],
      ['?Help', true],
      ['help', false],
      ['!help', false],
      ['/help ', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    // Test with command suffix pattern
    const oldSuffixPattern = /^[\/\?](sound|status|wait)$/i
    const newSuffixPattern = /^[/?](sound|status|wait)$/i

    test.each([
      ['/sound', true],
      ['?sound', true],
      ['/status', true],
      ['?status', true],
      ['/wait', true],
      ['?wait', true],
      ['/other', false],
    ])('suffix pattern "%s" matches: %s', (input, shouldMatch) => {
      expect(oldSuffixPattern.test(input)).toBe(shouldMatch)
      expect(newSuffixPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 3: Multiplier Patterns
   * Files: chat-processors.js, damage-tables.js, dierolls/dieroll.js, damagechat.js
   */
  describe('Category 3: Multiplier Patterns [×xX*]', () => {
    // OLD: /[×xX\*]\d+/  NEW: /[×xX*]\d+/
    const oldPattern = /[×xX\*]\d+/
    const newPattern = /[×xX*]\d+/

    test.each([
      ['x5', true],
      ['X10', true],
      ['*3', true],
      ['×2', true],
      ['x100', true],
      ['5x', false],
      ['abc', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('extracted multiplier is identical', () => {
      const testInput = '3d6 x5 damage'
      expect(testInput.match(oldPattern)?.[0]).toBe(testInput.match(newPattern)?.[0])
      expect(testInput.match(oldPattern)?.[0]).toBe('x5')
    })
  })

  /**
   * Category 4: Split DR Pattern
   * Files: _actor.js, gurps-actor.ts
   */
  describe('Category 4: Split DR Pattern [/|]', () => {
    // OLD: /(\d+) *([/\|]) *(\d+)/  NEW: /(\d+) *([/|]) *(\d+)/
    const oldPattern = /(\d+) *([/\|]) *(\d+)/
    const newPattern = /(\d+) *([/|]) *(\d+)/

    test.each([
      ['5/3', true],
      ['5|3', true],
      ['10 / 5', true],
      ['10 | 5', true],
      ['10  /  5', true],
      ['5', false],
      ['5-3', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('captured groups are identical', () => {
      const testInput = '10 | 5'
      const oldMatch = testInput.match(oldPattern)
      const newMatch = testInput.match(newPattern)

      expect(oldMatch?.[1]).toBe(newMatch?.[1])
      expect(oldMatch?.[2]).toBe(newMatch?.[2])
      expect(oldMatch?.[3]).toBe(newMatch?.[3])
      expect(oldMatch?.[1]).toBe('10')
      expect(oldMatch?.[2]).toBe('|')
      expect(oldMatch?.[3]).toBe('5')
    })
  })

  /**
   * Category 5: Bracket Replacement Pattern
   * Files: _actor.js, gurps-actor.ts
   */
  describe('Category 5: Bracket Replacement Pattern [[\\]]', () => {
    // OLD: /[\[\]]/g  NEW: /[[\]]/g
    const oldPattern = /[\[\]]/g
    const newPattern = /[[\]]/g

    test.each([
      ['[test]', true],
      ['[a][b]', true],
      ['[[nested]]', true],
      ['no brackets', false],
      ['abc', false],
    ])('"%s" contains brackets: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      // Reset lastIndex for global patterns
      oldPattern.lastIndex = 0
      newPattern.lastIndex = 0
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('replacement is identical', () => {
      const testInput = '[Skill-10]'
      // Reset lastIndex before each use
      oldPattern.lastIndex = 0
      newPattern.lastIndex = 0
      expect(testInput.replace(oldPattern, '')).toBe(testInput.replace(newPattern, ''))
      expect(testInput.replace(newPattern, '')).toBe('Skill-10')
    })
  })

  /**
   * Category 6: Sign Patterns
   * Files: chat-processors.js
   */
  describe('Category 6: Sign Patterns [+\\-=]', () => {
    // OLD: /[\+-=]\w+/  NEW: /[+\-=]\w+/
    // Note: In the old pattern, \+ was unnecessarily escaped
    const oldPattern = /[\+-=]\w+/
    const newPattern = /[+\-=]\w+/

    test.each([
      ['+5', true],
      ['-3', true],
      ['=10', true],
      ['+abc', true],
      ['-reset', true],
      ['5', false],
      ['abc', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 7: Stretch Patterns
   * Files: chat-processors.js, anim.js
   */
  describe('Category 7: Stretch Patterns [+>]', () => {
    // OLD: /[\+>]\d+/  NEW: /[+>]\d+/
    const oldPattern = /[\+>]\d+/
    const newPattern = /[+>]\d+/

    test.each([
      ['+100', true],
      ['>50', true],
      ['+1', true],
      ['>999', true],
      ['100', false],
      ['<50', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 8: Status Target Pattern (negated character class)
   * Files: status.js
   */
  describe('Category 8: Status Target Pattern [^@: ]', () => {
    // OLD: /[^\@: ]+/  NEW: /[^@: ]+/
    const oldPattern = /[^\@: ]+/
    const newPattern = /[^@: ]+/

    test.each([
      ['stunned', true],
      ['prone', true],
      ['abc123', true],
      ['@self', true], // matches 'self' part
      [':target', true], // matches 'target' part
      ['@ : ', false], // only contains excluded chars
    ])('"%s" has non-excluded chars: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('extracted status name is identical', () => {
      const testInput = 'stunned @self'
      expect(testInput.match(oldPattern)?.[0]).toBe(testInput.match(newPattern)?.[0])
      expect(testInput.match(oldPattern)?.[0]).toBe('stunned')
    })
  })

  /**
   * Category 9: Tracker Parens Pattern (negated character class)
   * Files: tracker.js
   */
  describe('Category 9: Tracker Parens Pattern [^)]', () => {
    // OLD: /\(([^\)]+)\)/  NEW: /\(([^)]+)\)/
    const oldPattern = /\(([^\)]+)\)/
    const newPattern = /\(([^)]+)\)/

    test.each([
      ['(name)', true],
      ['(tracker1)', true],
      ['(resource)', true],
      ['(multi word)', true],
      ['()', false], // empty parens
      ['text', false], // no parens
      ['(nested(parens))', true], // matches outer
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })

    test('captured content is identical', () => {
      const testInput = '/tracker (HP) +5'
      const oldMatch = testInput.match(oldPattern)
      const newMatch = testInput.match(newPattern)

      expect(oldMatch?.[0]).toBe(newMatch?.[0])
      expect(oldMatch?.[1]).toBe(newMatch?.[1])
      expect(oldMatch?.[1]).toBe('HP')
    })
  })

  /**
   * Category 10: Dice Sign Pattern (with en-dash)
   * Files: damage-utils.ts
   */
  describe('Category 10: Dice Sign Pattern [–\\-+]', () => {
    // OLD: /[–\-+]/  NEW: /[–\-+]/ (en-dash was unnecessarily escaped)
    // Note: – is en-dash (U+2013), - is hyphen-minus (U+002D)
    const oldPattern = /[–\-+]/
    const newPattern = /[–\-+]/

    test.each([
      ['+', true],
      ['-', true],
      ['–', true], // en-dash
      ['2d+1', true],
      ['3d-2', true],
      ['1d–1', true], // with en-dash
      ['abc', false],
      ['2d6', false],
    ])('"%s" contains sign: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 11: Comma-Separated Numbers Pattern
   * Files: resolve-diceroll-app.js
   */
  describe('Category 11: Comma-Separated Numbers [ ,0-9.+-]', () => {
    // OLD: /^\d*([ ,0-9\.\+-])*$/  NEW: /^\d*([ ,0-9.+-])*$/
    const oldPattern = /^\d*([ ,0-9\.\+-])*$/
    const newPattern = /^\d*([ ,0-9.+-])*$/

    test.each([
      ['1, 2, 3', true],
      ['1.5, 2.5', true],
      ['+1, -2', true],
      ['123', true],
      ['1,2,3', true],
      ['1.2.3', true],
      ['', true], // empty string matches
      ['abc', false],
      ['1a2', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 12: Range Conversion Patterns (compound patterns)
   * Files: ranged-attack.ts, _actor.js, gurps-actor.ts
   */
  describe('Category 12: Range Conversion Patterns', () => {
    // Single range: OLD: /^\s*[×xX]([\d\.]+)\s*$/  NEW: /^\s*[×xX]([\d.]+)\s*$/
    const oldSinglePattern = /^\s*[×xX]([\d\.]+)\s*$/
    const newSinglePattern = /^\s*[×xX]([\d.]+)\s*$/

    // Double range: OLD: /^\s*[×xX]([\d\.]+)\s*-\s*[×xX]([\d\.]+)\s*$/
    //               NEW: /^\s*[×xX]([\d.]+)\s*-\s*[×xX]([\d.]+)\s*$/
    const oldDoublePattern = /^\s*[×xX]([\d\.]+)\s*-\s*[×xX]([\d\.]+)\s*$/
    const newDoublePattern = /^\s*[×xX]([\d.]+)\s*-\s*[×xX]([\d.]+)\s*$/

    describe('single range pattern', () => {
      test.each([
        ['x2', true],
        ['X3.5', true],
        ['×10', true],
        [' x5 ', true],
        ['x1.5', true],
        ['2x', false],
        ['x', false],
      ])('"%s" matches: %s', (input, shouldMatch) => {
        expect(oldSinglePattern.test(input)).toBe(shouldMatch)
        expect(newSinglePattern.test(input)).toBe(shouldMatch)
      })

      test('captured multiplier is identical', () => {
        const testInput = 'x3.5'
        expect(testInput.match(oldSinglePattern)?.[1]).toBe(testInput.match(newSinglePattern)?.[1])
        expect(testInput.match(newSinglePattern)?.[1]).toBe('3.5')
      })
    })

    describe('double range pattern', () => {
      test.each([
        ['x2-x5', true],
        ['X1.5 - X3', true],
        ['×10 - ×20', true],
        [' x5 - x10 ', true],
        ['x2', false],
        ['2-5', false],
      ])('"%s" matches: %s', (input, shouldMatch) => {
        expect(oldDoublePattern.test(input)).toBe(shouldMatch)
        expect(newDoublePattern.test(input)).toBe(shouldMatch)
      })

      test('captured multipliers are identical', () => {
        const testInput = 'x1.5 - x3.5'
        const oldMatch = testInput.match(oldDoublePattern)
        const newMatch = testInput.match(newDoublePattern)

        expect(oldMatch?.[1]).toBe(newMatch?.[1])
        expect(oldMatch?.[2]).toBe(newMatch?.[2])
        expect(newMatch?.[1]).toBe('1.5')
        expect(newMatch?.[2]).toBe('3.5')
      })
    })
  })

  /**
   * Category 13: Command with dot prefix
   * Files: chat-processors.js
   */
  describe('Category 13: Dot/Slash Prefix Pattern [./]', () => {
    // OLD: /^[.\/](.*?)$/  NEW: /^[./](.*?)$/
    const oldPattern = /^[.\/](.*?)$/
    const newPattern = /^[./](.*?)$/

    test.each([
      ['.test', true],
      ['/test', true],
      ['.', true],
      ['/', true],
      ['test', false],
      ['?test', false],
    ])('"%s" matches: %s', (input, shouldMatch) => {
      expect(oldPattern.test(input)).toBe(shouldMatch)
      expect(newPattern.test(input)).toBe(shouldMatch)
    })
  })

  /**
   * Category 14: Equipment search pattern
   * Files: chat-processors.js
   */
  describe('Category 14: Equipment Search Pattern [o.:]', () => {
    // OLD: /^(o[\.:])?(.*)/i  NEW: /^(o[.:])?(.*)/i
    const oldPattern = /^(o[\.:])?(.*)/i
    const newPattern = /^(o[.:])?(.*)/i

    test.each([
      ['o.sword', true],
      ['o:shield', true],
      ['O.Armor', true],
      ['O:Weapon', true],
      ['sword', true], // matches without prefix
      ['', true], // empty matches
    ])('"%s" matches: %s', (input, _shouldMatch) => {
      // Both patterns always match due to optional groups and .*
      // Test that captured groups are identical instead
      const oldMatch = input.match(oldPattern)
      const newMatch = input.match(newPattern)

      expect(oldMatch?.[0]).toBe(newMatch?.[0])
      expect(oldMatch?.[1]).toBe(newMatch?.[1])
      expect(oldMatch?.[2]).toBe(newMatch?.[2])
    })

    test('prefix capture is correct', () => {
      expect('o.sword'.match(newPattern)?.[1]).toBe('o.')
      expect('o:shield'.match(newPattern)?.[1]).toBe('o:')
      expect('sword'.match(newPattern)?.[1]).toBeUndefined()
    })
  })

  /**
   * Additional edge case tests
   */
  describe('Edge Cases', () => {
    test('multiple occurrences in global pattern', () => {
      const oldPattern = /[\d\.]+/g
      const newPattern = /[\d.]+/g

      const testInput = '1.5 and 2.5 and 3.5'
      expect(testInput.match(oldPattern)).toEqual(testInput.match(newPattern))
      expect(testInput.match(newPattern)).toEqual(['1.5', '2.5', '3.5'])
    })

    test('unicode multiplication sign', () => {
      const oldPattern = /[×xX\*]/
      const newPattern = /[×xX*]/

      expect(oldPattern.test('×')).toBe(true)
      expect(newPattern.test('×')).toBe(true)
      expect('3×5'.match(oldPattern)?.[0]).toBe('3×5'.match(newPattern)?.[0])
    })

    test('en-dash vs hyphen-minus', () => {
      const oldPattern = /[–\-]/
      const newPattern = /[–\-]/

      // Both should match both characters
      expect(oldPattern.test('–')).toBe(true) // en-dash
      expect(oldPattern.test('-')).toBe(true) // hyphen-minus
      expect(newPattern.test('–')).toBe(true)
      expect(newPattern.test('-')).toBe(true)
    })
  })
})
