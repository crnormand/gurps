import { jest } from '@jest/globals'
import { migrateTemplateToV2, migrateTrackerInstanceToV2 } from '@module/resource-tracker/migration.js'
import { IResourceTracker } from '@module/resource-tracker/types.js'

const legacyTrackerInstance = {
  name: 'Control Points',
  value: 0,
  min: 0,
  max: 16,
  points: 0,
  alias: 'ctrl',
  pdf: 'FDG4',
  isDamageTracker: true,
  isDamageType: true,
  initialValue: '',
  isMaximumEnforced: false,
  isMinimumEnforced: false,
  thresholds: [
    {
      comparison: '<',
      operator: '×',
      value: 0.1,
      condition: 'Unrestrained',
      color: '#90ee90',
    },
    {
      comparison: '≥',
      operator: '×',
      value: 0.5,
      condition: 'Grabbed [-2 DX]',
      color: '#eeee30',
    },
    {
      comparison: '≥',
      operator: '×',
      value: 1,
      condition: 'Grappled [-4 DX]',
      color: '#eeaa30',
    },
    {
      comparison: '≥',
      operator: '×',
      value: 1.5,
      condition: 'Restrained [-6 DX]',
      color: '#ee5000',
    },
    {
      comparison: '≥',
      operator: '×',
      value: 2,
      condition: 'Controlled [-8 DX]',
      color: '#ee0000',
    },
    {
      comparison: '≥',
      operator: '×',
      value: 2,
      condition: 'Pinned [-12 DX]',
      color: '#900000',
    },
  ],
  breakpoints: true,
}

let counter = 1

const legacyTemplate = {
  tracker: legacyTrackerInstance,
  initialValue: 'attributes.HP.max',
  slot: true,
}

describe('migrateTemplateToV2', () => {
  beforeEach(() => {
    if (!foundry.utils.randomID) {
      // @ts-expect-error - Mocking a function that may not exist in the test environment.
      foundry.utils.randomID = jest.fn()
    }

    jest.spyOn(foundry.utils, 'randomID').mockImplementation(() => `mocked-id-${counter++}`)
  })

  it('maps template fields to the v2 shape', () => {
    const result = migrateTemplateToV2(legacyTemplate)

    expect(result).toHaveProperty('id')
    expect(result.id).toMatch(/^mocked-id-\d+$/)
    expect(result).toHaveProperty('autoapply', true)
    expect(result).toHaveProperty('tracker')
    expect(result.tracker).toHaveProperty('initialValue', 'attributes.HP.max')
  })

  it('migrates nested tracker data using tracker migration', () => {
    const result = migrateTemplateToV2(legacyTemplate)

    expect(result.tracker).toHaveProperty('_id')
    expect(result.tracker._id).toMatch(/^mocked-id-\d+$/)
    expect(result.tracker).toHaveProperty('name', 'Control Points')
    expect(result.tracker).toHaveProperty('currentValue', 0)
    expect(result.tracker).toHaveProperty('isAccumulator', true)
    expect(result.tracker).toHaveProperty('useBreakpoints', true)

    expect(result.tracker).not.toHaveProperty('value')
    expect(result.tracker).not.toHaveProperty('isDamageTracker')
    expect(result.tracker).not.toHaveProperty('breakpoints')
  })

  test.each([
    ['truthy slot', 1, true],
    ['falsy slot', 0, false],
    ['missing slot', undefined, false],
  ])('sets autoapply from %s', (_label, slot, expected) => {
    const result = migrateTemplateToV2({
      ...legacyTemplate,
      slot,
    })

    expect(result.autoapply).toBe(expected)
  })
})

describe('migrateTrackerInstanceToV2', () => {
  beforeEach(() => {
    if (!foundry.utils.randomID) {
      // @ts-expect-error - Mocking a function that may not exist in the test environment.
      foundry.utils.randomID = jest.fn()
    }

    jest.spyOn(foundry.utils, 'randomID').mockImplementation(() => `mocked-id-${counter++}`)
  })

  it('creates a TrackerInstance from legacy tracker data', async () => {
    const result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('name', 'Control Points')
    expect(result).toHaveProperty('alias', 'ctrl')
    expect(result).toHaveProperty('pdf', 'FDG4')
    expect(result).toHaveProperty('isDamageType', true)
    expect(result).toHaveProperty('min', 0)
    expect(result).toHaveProperty('thresholds', legacyTrackerInstance.thresholds)
  })

  it('maps legacy value to currentValue', () => {
    let result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('currentValue', 0)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      value: null,
    }) as IResourceTracker

    expect(result).toHaveProperty('currentValue', null)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      value: 7,
    }) as IResourceTracker

    expect(result).toHaveProperty('currentValue', 7)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      value: undefined,
    }) as IResourceTracker

    expect(result).toHaveProperty('currentValue', null)
  })

  it('maps legacy max to initialValue', () => {
    let result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      initialValue: '',
      max: 16,
    }) as IResourceTracker

    expect(result).toHaveProperty('initialValue', '16')

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      initialValue: null,
      max: 20,
    }) as IResourceTracker

    expect(result).toHaveProperty('initialValue', '20')
  })

  it('maps legacy initialValue to initialValue when present and non-empty', () => {
    let result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      initialValue: '12',
      max: 16,
    }) as IResourceTracker

    expect(result).toHaveProperty('initialValue', '12')

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      initialValue: 'attributes.HP.max',
      max: 16,
    }) as IResourceTracker

    expect(result).toHaveProperty('initialValue', 'attributes.HP.max')
  })

  it('maps isDamageTracker to isAccumulator', () => {
    let result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('isAccumulator', true)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      isDamageTracker: false,
    }) as IResourceTracker

    expect(result).toHaveProperty('isAccumulator', false)
  })

  it('maps breakpoints to useBreakpoints', () => {
    let result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('useBreakpoints', true)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      breakpoints: false,
    }) as IResourceTracker

    expect(result).toHaveProperty('useBreakpoints', false)
  })

  it('maps isMaximumEnforced to isMaxEnforced', () => {
    let result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('isMaxEnforced', false)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      isMaximumEnforced: true,
    }) as IResourceTracker

    expect(result).toHaveProperty('isMaxEnforced', true)
  })

  it('maps isMinimumEnforced to isMinEnforced', () => {
    let result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).toHaveProperty('isMinEnforced', false)

    result = migrateTrackerInstanceToV2({
      ...legacyTrackerInstance,
      isMinimumEnforced: true,
    }) as IResourceTracker

    expect(result).toHaveProperty('isMinEnforced', true)
  })

  it('drops legacy-only fields from the migrated instance', () => {
    const result = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(result).not.toHaveProperty('value')
    expect(result).not.toHaveProperty('max')
    expect(result).not.toHaveProperty('isDamageTracker')
    expect(result).not.toHaveProperty('breakpoints')
    expect(result).not.toHaveProperty('isMaximumEnforced')
    expect(result).not.toHaveProperty('isMinimumEnforced')
  })

  it('assigns a unique _id to the migrated instance', () => {
    const result1 = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker
    const result2 = migrateTrackerInstanceToV2(legacyTrackerInstance) as IResourceTracker

    expect(foundry.utils.randomID).toHaveBeenCalled()

    expect(result1).toHaveProperty('_id')
    expect(result2).toHaveProperty('_id')
    expect(result1._id).toMatch(/^mocked-id-\d+$/)
    expect(result2._id).toMatch(/^mocked-id-\d+$/)
    expect(result1._id).not.toBe(result2._id)
  })
})
