import { shouldUpdateName, shouldUpdateField } from '../../module/actor/modern/inline-edit-handler.ts'

describe('shouldUpdateName', () => {
  test('returns true when name is different', () => {
    expect(shouldUpdateName('New Name', 'Old Name')).toBe(true)
  })

  test('returns false when name is the same', () => {
    expect(shouldUpdateName('Same Name', 'Same Name')).toBe(false)
  })

  test('returns false for empty new name', () => {
    expect(shouldUpdateName('', 'Current Name')).toBe(false)
  })

  test('returns false for whitespace-only new name', () => {
    expect(shouldUpdateName('   ', 'Current Name')).toBe(false)
  })

  test('trims whitespace before comparison', () => {
    expect(shouldUpdateName('  New Name  ', 'New Name')).toBe(false)
  })

  test('returns true when trimmed name differs', () => {
    expect(shouldUpdateName('  New Name  ', 'Old Name')).toBe(true)
  })

  test('handles empty current name', () => {
    expect(shouldUpdateName('New Name', '')).toBe(true)
  })

  test('case sensitive comparison', () => {
    expect(shouldUpdateName('name', 'Name')).toBe(true)
  })
})

describe('shouldUpdateField', () => {
  test('returns true when value is different', () => {
    expect(shouldUpdateField('new value', 'old value')).toBe(true)
  })

  test('returns false when value is the same', () => {
    expect(shouldUpdateField('same', 'same')).toBe(false)
  })

  test('handles undefined current value', () => {
    expect(shouldUpdateField('new value', undefined)).toBe(true)
  })

  test('returns false for empty new value matching undefined', () => {
    expect(shouldUpdateField('', undefined)).toBe(false)
  })

  test('trims whitespace before comparison', () => {
    expect(shouldUpdateField('  value  ', 'value')).toBe(false)
  })

  test('returns true when trimmed value differs', () => {
    expect(shouldUpdateField('  new  ', 'old')).toBe(true)
  })

  test('case sensitive comparison', () => {
    expect(shouldUpdateField('Value', 'value')).toBe(true)
  })

  test('handles empty string current value', () => {
    expect(shouldUpdateField('new', '')).toBe(true)
  })

  test('empty matches empty', () => {
    expect(shouldUpdateField('', '')).toBe(false)
  })

  test('whitespace-only treated as empty', () => {
    expect(shouldUpdateField('   ', '')).toBe(false)
  })
})
