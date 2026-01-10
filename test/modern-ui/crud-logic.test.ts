// @ts-expect-error - test-only import
import { buildEntityPath, getDisplayName } from '../../module/actor/modern/crud-handler'

beforeAll(() => {
  // @ts-expect-error - mock for testing
  globalThis.game = {
    ready: true,
    i18n: {
      localize: (key: string) => key,
    },
  }
})

describe('buildEntityPath', () => {
  test('builds path from base and key', () => {
    expect(buildEntityPath('system.skills', 'abc123')).toBe('system.skills.abc123')
  })

  test('handles nested base paths', () => {
    expect(buildEntityPath('system.equipment.carried', 'item1')).toBe('system.equipment.carried.item1')
  })

  test('handles empty key', () => {
    expect(buildEntityPath('system.skills', '')).toBe('system.skills.')
  })

  test('handles special characters in key', () => {
    expect(buildEntityPath('system.skills', 'key-with-dashes')).toBe('system.skills.key-with-dashes')
  })
})

describe('getDisplayName', () => {
  test('returns name property when present', () => {
    const obj = { name: 'Test Skill' }

    expect(getDisplayName(obj, 'name', 'GURPS.skill')).toBe('Test Skill')
  })

  test('returns fallback locale key when obj is undefined', () => {
    expect(getDisplayName(undefined, 'name', 'GURPS.skill')).toBe('GURPS.skill')
  })

  test('returns fallback when property is missing', () => {
    const obj = { other: 'value' }

    expect(getDisplayName(obj, 'name', 'GURPS.skill')).toBe('GURPS.skill')
  })

  test('returns fallback when property is not a string', () => {
    const obj = { name: 123 }

    expect(getDisplayName(obj, 'name', 'GURPS.skill')).toBe('GURPS.skill')
  })

  test('uses custom display property', () => {
    const obj = { situation: 'When attacking' }

    expect(getDisplayName(obj, 'situation', 'GURPS.modifier')).toBe('When attacking')
  })

  test('returns empty string property value', () => {
    const obj = { name: '' }

    expect(getDisplayName(obj, 'name', 'GURPS.skill')).toBe('')
  })

  test('handles null obj', () => {
    expect(getDisplayName(null as any, 'name', 'GURPS.skill')).toBe('GURPS.skill')
  })
})
