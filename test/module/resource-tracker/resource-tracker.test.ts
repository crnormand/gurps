import {
  ComparisonFunctions,
  GT,
  GTE,
  LT,
  LTE,
  MULTIPLY,
  OperatorFunctions,
  ResourceTrackerThreshold,
  TrackerInstance,
} from '@module/resource-tracker/resource-tracker.js'

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

  describe('thresholdDescriptors', () => {
    it('returns the descriptors for an accumulator', () => {
      const instance = tracker()

      instance.max = 100
      instance.isDamageTracker = true
      instance.breakpoints = true

      const t1 = new ResourceTrackerThreshold()

      t1.comparison = LT
      t1.operator = MULTIPLY
      t1.value = 0.1
      t1.condition = 'Unrestrained'

      const t2 = new ResourceTrackerThreshold()

      t2.comparison = GTE
      t2.operator = MULTIPLY
      t2.value = 0.1
      t2.condition = 'Grabbed'

      const t3 = new ResourceTrackerThreshold()

      t3.comparison = GTE
      t3.operator = MULTIPLY
      t3.value = 0.5
      t3.condition = 'Grappled'

      const t4 = new ResourceTrackerThreshold()

      t4.comparison = GTE
      t4.operator = MULTIPLY
      t4.value = 1.0
      t4.condition = 'Restrained'

      const t5 = new ResourceTrackerThreshold()

      t5.comparison = GTE
      t5.operator = MULTIPLY
      t5.value = 1.5
      t5.condition = 'Controlled'

      const t6 = new ResourceTrackerThreshold()

      t6.comparison = GTE
      t6.operator = MULTIPLY
      t6.value = 2.0
      t6.condition = 'Pinned'

      instance.thresholds = [t1, t2, t3, t4, t5, t6]

      const descriptors = instance.thresholdDescriptors

      expect(Array.isArray(descriptors)).toBe(true)
      expect(descriptors[0]).toEqual({ value: 0, condition: 'Unrestrained' })
      expect(descriptors[1]).toEqual({ value: 10, condition: 'Grabbed' })
      expect(descriptors[2]).toEqual({ value: 50, condition: 'Grappled' })
      expect(descriptors[3]).toEqual({ value: 100, condition: 'Restrained' })
      expect(descriptors[4]).toEqual({ value: 150, condition: 'Controlled' })
      expect(descriptors[5]).toEqual({ value: 200, condition: 'Pinned' })
    })

    it('returns the descriptors for a non-accumulator', () => {
      const instance = tracker()

      instance.max = 100
      instance.isDamageTracker = false
      instance.breakpoints = false

      // Let's emulate a health tracker with thresholds at 1/3, 0, -1 x HP, -2 x HP, etc...
      const t1 = new ResourceTrackerThreshold()

      t1.comparison = GT
      t1.operator = MULTIPLY
      t1.value = 1 / 3
      t1.condition = 'Healthy'

      const t2 = new ResourceTrackerThreshold()

      t2.comparison = LTE
      t2.operator = MULTIPLY
      t2.value = 1 / 3
      t2.condition = 'Reeling'

      const t3 = new ResourceTrackerThreshold()

      t3.comparison = LTE
      t3.operator = MULTIPLY
      t3.value = 0
      t3.condition = 'Danger of Collapse'

      const t4 = new ResourceTrackerThreshold()

      t4.comparison = LTE
      t4.operator = MULTIPLY
      t4.value = -1
      t4.condition = 'Death Check 1'

      const t5 = new ResourceTrackerThreshold()

      t5.comparison = LTE
      t5.operator = MULTIPLY
      t5.value = -2
      t5.condition = 'Death Check 2'

      const t6 = new ResourceTrackerThreshold()

      t6.comparison = LTE
      t6.operator = MULTIPLY
      t6.value = -3
      t6.condition = 'Death Check 3'

      const t7 = new ResourceTrackerThreshold()

      t7.comparison = LTE
      t7.operator = MULTIPLY
      t7.value = -4
      t7.condition = 'Death Check 4'

      const t8 = new ResourceTrackerThreshold()

      t8.comparison = LTE
      t8.operator = MULTIPLY
      t8.value = -5
      t8.condition = 'Dead'

      const t9 = new ResourceTrackerThreshold()

      t9.comparison = LT
      t9.operator = MULTIPLY
      t9.value = -10
      t9.condition = 'Destroyed'

      instance.thresholds = [t1, t2, t3, t4, t5, t6, t7, t8, t9]

      const descriptors = instance.thresholdDescriptors

      expect(Array.isArray(descriptors)).toBe(true)
      expect(descriptors[0]).toEqual({ value: 100, condition: 'Healthy' })
      expect(descriptors[1]).toEqual({ value: 33, condition: 'Reeling' })
      expect(descriptors[2]).toEqual({ value: 0, condition: 'Danger of Collapse' })
      expect(descriptors[3]).toEqual({ value: -100, condition: 'Death Check 1' })
      expect(descriptors[4]).toEqual({ value: -200, condition: 'Death Check 2' })
      expect(descriptors[5]).toEqual({ value: -300, condition: 'Death Check 3' })
      expect(descriptors[6]).toEqual({ value: -400, condition: 'Death Check 4' })
      expect(descriptors[7]).toEqual({ value: -500, condition: 'Dead' })
      expect(descriptors[8]).toEqual({ value: -1000, condition: 'Destroyed' })
    })
  })

  describe('getOperation', () => {
    test('should return correct operation function', () => {
      expect(OperatorFunctions['+'](1, 2)).toBe(3)
      expect(OperatorFunctions['×'](2, 3)).toBe(6)
      expect(OperatorFunctions['÷'](6, 2)).toBe(3)
      expect(OperatorFunctions['-'](5, 3)).toBe(2)
    })
  })

  describe('getComparison', () => {
    test('should return correct comparison function', () => {
      expect(ComparisonFunctions['>'](3, 2)).toBe(true)
      expect(ComparisonFunctions['≥'](3, 3)).toBe(true)
      expect(ComparisonFunctions['≤'](2, 3)).toBe(true)
    })
  })
})
