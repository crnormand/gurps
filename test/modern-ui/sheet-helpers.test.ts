interface NestedContainer {
  contains?: Record<string, NestedContainer>
  collapsed?: Record<string, NestedContainer>
}

function countItems(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0
  let count = 0
  const record = obj as Record<string, NestedContainer>
  for (const key in record) {
    count++
    if (record[key]?.contains) count += countItems(record[key].contains)
    if (record[key]?.collapsed) count += countItems(record[key].collapsed)
  }
  return count
}

describe('countItems', () => {
  test('returns 0 for null', () => {
    expect(countItems(null)).toBe(0)
  })

  test('returns 0 for undefined', () => {
    expect(countItems(undefined)).toBe(0)
  })

  test('returns 0 for empty object', () => {
    expect(countItems({})).toBe(0)
  })

  test('returns 0 for non-object', () => {
    expect(countItems('string')).toBe(0)
    expect(countItems(123)).toBe(0)
  })

  test('counts flat items correctly', () => {
    const items = {
      item1: { name: 'Skill 1' },
      item2: { name: 'Skill 2' },
      item3: { name: 'Skill 3' },
    }
    expect(countItems(items)).toBe(3)
  })

  test('counts nested items in contains property', () => {
    const items = {
      parent: {
        name: 'Parent Skill',
        contains: {
          child1: { name: 'Child 1' },
          child2: { name: 'Child 2' },
        },
      },
    }
    expect(countItems(items)).toBe(3)
  })

  test('counts nested items in collapsed property', () => {
    const items = {
      parent: {
        name: 'Parent Trait',
        collapsed: {
          child1: { name: 'Child 1' },
          child2: { name: 'Child 2' },
        },
      },
    }
    expect(countItems(items)).toBe(3)
  })

  test('counts deeply nested items', () => {
    const items = {
      level1: {
        name: 'Level 1',
        contains: {
          level2a: {
            name: 'Level 2A',
            contains: {
              level3: { name: 'Level 3' },
            },
          },
          level2b: { name: 'Level 2B' },
        },
      },
    }
    expect(countItems(items)).toBe(4)
  })

  test('counts items with both contains and collapsed', () => {
    const items = {
      parent: {
        name: 'Parent',
        contains: {
          visible: { name: 'Visible Child' },
        },
        collapsed: {
          hidden: { name: 'Hidden Child' },
        },
      },
    }
    expect(countItems(items)).toBe(3)
  })
})
