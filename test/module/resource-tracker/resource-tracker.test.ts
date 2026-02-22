import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'

type ThresholdInput = {
  comparison: string
  operator: string
  value: number
  condition: string
  color: string
}

const threshold = (overrides: Partial<ThresholdInput> = {}): ThresholdInput => ({
  comparison: '≤',
  operator: '+',
  value: 0,
  condition: 'Test Condition',
  color: '#ffffff',
  ...overrides,
})

const tracker = (overrides: Partial<Record<string, unknown>> = {}): TrackerInstance =>
  new TrackerInstance({
    max: 0,
    value: 0,
    breakpoints: false,
    thresholds: [],
    ...overrides,
  })

describe('TrackerInstance getters', () => {
  describe('currentThreshold', () => {
    it('returns null when no threshold matches', () => {
      const instance = tracker({
        value: 6,
        thresholds: [threshold({ value: 5 })],
      })

      expect(instance.currentThreshold).toBeNull()
    })

    it('returns first matching threshold when breakpoints is false', () => {
      const firstMatch = threshold({ value: 7, condition: 'First Match', color: '#111111' })
      const laterMatch = threshold({ value: 10, condition: 'Later Match', color: '#222222' })
      const instance = tracker({
        breakpoints: false,
        value: 6,
        thresholds: [firstMatch, laterMatch],
      })

      expect(instance.currentThreshold?.condition).toBe('First Match')
      expect(instance.currentThreshold?.color).toBe('#111111')
    })

    it('returns last matching threshold when breakpoints is true', () => {
      const firstMatch = threshold({ value: 7, condition: 'First Match', color: '#111111' })
      const lastMatch = threshold({ value: 10, condition: 'Last Match', color: '#333333' })
      const instance = tracker({
        breakpoints: true,
        value: 6,
        thresholds: [firstMatch, lastMatch],
      })

      expect(instance.currentThreshold?.condition).toBe('Last Match')
      expect(instance.currentThreshold?.color).toBe('#333333')
    })
  })
})
