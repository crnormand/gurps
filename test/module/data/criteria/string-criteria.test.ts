import { StringCriteria } from '../../../../module/data/criteria/string-criteria.ts'

describe('String Criteria', () => {
  describe('Comparitor: Any String', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.Any })

    it('any string matches', () => {
      expect(c.matches('hello')).toBe(true)
    })
  })

  describe('Comparitor: Is', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.Is, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.Is, qualifier: '' })

    // Tests with qualifier value 'test'

    it('matches exact string', () => {
      expect(c.matches('test')).toBe(true)
    })

    it('does not match different string', () => {
      expect(c.matches('asdf')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(c.matches('TEST')).toBe(true)
      expect(c.matches('TeSt')).toBe(true)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  test  ')).toBe(true)
    })

    it('does not match when value merely contains qualifier', () => {
      expect(c.matches('testing')).toBe(false)
      expect(c.matches('my test string')).toBe(false)
    })

    it('does not match when string is empty', () => {
      expect(c.matches('')).toBe(false)
      expect(c.matches('   ')).toBe(false)
    })

    // Tests with empty qualifier

    it('matches when both value and qualifier are empty', () => {
      expect(emptyC.matches('')).toBe(true)
    })

    it('matches when both value and qualifier are whitespace', () => {
      expect(emptyC.matches('   ')).toBe(true)
    })

    it('does not match when value is non-empty', () => {
      expect(emptyC.matches('non-empty')).toBe(false)
    })
  })

  describe('Comparitor: Is Not', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.IsNot, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.IsNot, qualifier: '' })

    // Tests with qualifier value 'test'

    it('does not match exact string', () => {
      expect(c.matches('test')).toBe(false)
    })

    it('matches different string', () => {
      expect(c.matches('asdf')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(c.matches('TEST')).toBe(false)
      expect(c.matches('TeSt')).toBe(false)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  test  ')).toBe(false)
      expect(c.matches('  different  ')).toBe(true)
    })

    it('matches when value merely contains qualifier', () => {
      expect(c.matches('testing')).toBe(true)
      expect(c.matches('my test string')).toBe(true)
    })

    it('matches when string is empty', () => {
      expect(c.matches('')).toBe(true)
      expect(c.matches('   ')).toBe(true)
    })

    // Tests with empty qualifier

    it('does not match when both value and qualifier are empty', () => {
      expect(emptyC.matches('')).toBe(false)
    })

    it('does not match when both value and qualifier are whitespace', () => {
      expect(emptyC.matches('   ')).toBe(false)
    })

    it('matches when value is non-empty', () => {
      expect(emptyC.matches('non-empty')).toBe(true)
    })
  })

  describe('Comparitor: Contains', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.Contains, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.Contains, qualifier: '' })

    // Tests with qualifier value 'test'

    it('matches when string contains qualifier', () => {
      expect(c.matches('this is a test string')).toBe(true)
      expect(c.matches('testing')).toBe(true)
      expect(c.matches('pretestpost')).toBe(true)
      expect(c.matches('test')).toBe(true)
    })

    it('does not match when string does not contain qualifier', () => {
      expect(c.matches('hello world')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(c.matches('This is a TEST string')).toBe(true)
      expect(c.matches('TESTING')).toBe(true)
      expect(c.matches('PreTestPost')).toBe(true)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  this is a test string  ')).toBe(true)
      expect(c.matches('  hello world  ')).toBe(false)
    })

    it('does not match when string is empty', () => {
      expect(c.matches('')).toBe(false)
      expect(c.matches('   ')).toBe(false)
    })

    // Tests with empty qualifier

    it('matches any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(true)
      expect(emptyC.matches('')).toBe(true)
    })

    it('matches any string with whitespace when qualifier is empty', () => {
      expect(emptyC.matches('   ')).toBe(true)
      expect(emptyC.matches('  hello  ')).toBe(true)
    })
  })

  describe('Comparitor: Does Not Contain', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotContain, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotContain, qualifier: '' })

    // Tests with qualifier value 'test'

    it('does not match when string contains qualifier', () => {
      expect(c.matches('this is a test string')).toBe(false)
      expect(c.matches('testing')).toBe(false)
      expect(c.matches('pretestpost')).toBe(false)
      expect(c.matches('test')).toBe(false)
    })

    it('matches when string does not contain qualifier', () => {
      expect(c.matches('hello world')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(c.matches('This is a TEST string')).toBe(false)
      expect(c.matches('TESTING')).toBe(false)
      expect(c.matches('PreTestPost')).toBe(false)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  this is a test string  ')).toBe(false)
      expect(c.matches('  hello world  ')).toBe(true)
    })

    it('matches when string is empty', () => {
      expect(c.matches('')).toBe(true)
      expect(c.matches('   ')).toBe(true)
    })

    // Tests with empty qualifier

    it('does not match any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(false)
      expect(emptyC.matches('')).toBe(false)
      expect(emptyC.matches('   ')).toBe(false)
      expect(emptyC.matches('  hello  ')).toBe(false)
    })
  })

  describe('Comparitor: Starts With', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.StartsWith, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.StartsWith, qualifier: '' })

    // Tests with qualifier value 'test'

    it('matches when string starts with qualifier', () => {
      expect(c.matches('test string')).toBe(true)
      expect(c.matches('testing')).toBe(true)
      expect(c.matches('test')).toBe(true)
    })

    it('does not match when string does not start with qualifier', () => {
      expect(c.matches('this is a test')).toBe(false)
      expect(c.matches('hello world')).toBe(false)
      expect(c.matches('pretestpost')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(c.matches('TEST string')).toBe(true)
      expect(c.matches('TESTING')).toBe(true)
      expect(c.matches('TEST')).toBe(true)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  test string  ')).toBe(true)
      expect(c.matches('  hello world  ')).toBe(false)
    })

    it('does not match when string is empty', () => {
      expect(c.matches('')).toBe(false)
    })

    // Tests with empty qualifier

    it('matches any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(true)
      expect(emptyC.matches('')).toBe(true)
      expect(emptyC.matches('   ')).toBe(true)
      expect(emptyC.matches('  hello  ')).toBe(true)
    })
  })

  describe('Comparitor: Does Not Start With', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotStartWith, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotStartWith, qualifier: '' })

    // Tests with qualifier value 'test'

    it('does not match when string starts with qualifier', () => {
      expect(c.matches('test string')).toBe(false)
      expect(c.matches('testing')).toBe(false)
      expect(c.matches('test')).toBe(false)
    })

    it('matches when string does not start with qualifier', () => {
      expect(c.matches('this is a test')).toBe(true)
      expect(c.matches('hello world')).toBe(true)
      expect(c.matches('pretestpost')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(c.matches('TEST string')).toBe(false)
      expect(c.matches('TESTING')).toBe(false)
      expect(c.matches('TEST')).toBe(false)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  test string  ')).toBe(false)
      expect(c.matches('  hello world  ')).toBe(true)
    })

    it('matches when string is empty', () => {
      expect(c.matches('')).toBe(true)
      expect(c.matches('   ')).toBe(true)
    })

    // Tests with empty qualifier

    it('does not match any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(false)
      expect(emptyC.matches('')).toBe(false)
      expect(emptyC.matches('   ')).toBe(false)
      expect(emptyC.matches('  hello  ')).toBe(false)
    })
  })

  describe('Comparitor: Ends With', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.EndsWith, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.EndsWith, qualifier: '' })

    // Tests with qualifier value 'test'

    it('matches when string ends with qualifier', () => {
      expect(c.matches('this is a test')).toBe(true)
      expect(c.matches('pretest')).toBe(true)
    })

    it('does not match when string does not end with qualifier', () => {
      expect(c.matches('testing')).toBe(false)
      expect(c.matches('hello world')).toBe(false)
      expect(c.matches('test string')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(c.matches('This is a TEST')).toBe(true)
      expect(c.matches('PRETEST')).toBe(true)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  this is a test  ')).toBe(true)
      expect(c.matches('  hello world  ')).toBe(false)
    })

    it('does not match when string is empty', () => {
      expect(c.matches('')).toBe(false)
      expect(c.matches('   ')).toBe(false)
    })

    // Tests with empty qualifier

    it('matches any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(true)
      expect(emptyC.matches('')).toBe(true)
      expect(emptyC.matches('   ')).toBe(true)
      expect(emptyC.matches('  hello  ')).toBe(true)
    })
  })

  describe('Comparitor: Does Not End With', () => {
    const c = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotEndWith, qualifier: 'test' })
    const emptyC = new StringCriteria({ compare: StringCriteria.Comparison.DoesNotEndWith, qualifier: '' })

    it('does not match when string ends with qualifier', () => {
      expect(c.matches('this is a test')).toBe(false)
      expect(c.matches('pretest')).toBe(false)
    })

    it('matches when string does not end with qualifier', () => {
      expect(c.matches('testing')).toBe(true)
      expect(c.matches('hello world')).toBe(true)
      expect(c.matches('test string')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(c.matches('This is a TEST')).toBe(false)
      expect(c.matches('PRETEST')).toBe(false)
    })

    it('ignores leading/trailing whitespace', () => {
      expect(c.matches('  this is a test  ')).toBe(false)
      expect(c.matches('  hello world  ')).toBe(true)
    })

    it('matches when string is empty', () => {
      expect(c.matches('')).toBe(true)
      expect(c.matches('   ')).toBe(true)
    })

    // Tests with empty qualifier

    it('does not match any string when qualifier is empty', () => {
      expect(emptyC.matches('hello')).toBe(false)
      expect(emptyC.matches('')).toBe(false)
      expect(emptyC.matches('   ')).toBe(false)
      expect(emptyC.matches('  hello  ')).toBe(false)
    })
  })
})
