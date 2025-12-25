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

interface TotalPoints {
  race?: string | number
  ads?: string | number
  attributes?: string | number
  skills?: string | number
  spells?: string | number
  disads?: string | number
  quirks?: string | number
}

function calculatePositivePoints(totalpoints: TotalPoints): number {
  const racePoints = parseInt(String(totalpoints.race ?? 0)) || 0
  return (
    (parseInt(String(totalpoints.ads ?? 0)) || 0) +
    (parseInt(String(totalpoints.attributes ?? 0)) || 0) +
    (parseInt(String(totalpoints.skills ?? 0)) || 0) +
    (parseInt(String(totalpoints.spells ?? 0)) || 0) +
    (racePoints > 0 ? racePoints : 0)
  )
}

function calculateNegativePoints(totalpoints: TotalPoints): number {
  const racePoints = parseInt(String(totalpoints.race ?? 0)) || 0
  return Math.abs(
    (parseInt(String(totalpoints.disads ?? 0)) || 0) +
    (parseInt(String(totalpoints.quirks ?? 0)) || 0) +
    (racePoints < 0 ? racePoints : 0)
  )
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

describe('calculatePositivePoints', () => {
  test('returns 0 for empty object', () => {
    expect(calculatePositivePoints({})).toBe(0)
  })

  test('sums positive point categories', () => {
    const points = {
      ads: 50,
      attributes: 100,
      skills: 30,
      spells: 20,
    }
    expect(calculatePositivePoints(points)).toBe(200)
  })

  test('handles string values', () => {
    const points = {
      ads: '50',
      attributes: '100',
      skills: '30',
      spells: '20',
    }
    expect(calculatePositivePoints(points)).toBe(200)
  })

  test('includes positive race points', () => {
    const points = {
      ads: 50,
      race: 25,
    }
    expect(calculatePositivePoints(points)).toBe(75)
  })

  test('excludes negative race points', () => {
    const points = {
      ads: 50,
      race: -25,
    }
    expect(calculatePositivePoints(points)).toBe(50)
  })

  test('handles undefined values as 0', () => {
    const points = {
      ads: 50,
      skills: undefined,
    }
    expect(calculatePositivePoints(points)).toBe(50)
  })

  test('handles non-numeric strings as 0', () => {
    const points = {
      ads: 'invalid',
      skills: 30,
    }
    expect(calculatePositivePoints(points as any)).toBe(30)
  })
})

describe('calculateNegativePoints', () => {
  test('returns 0 for empty object', () => {
    expect(calculateNegativePoints({})).toBe(0)
  })

  test('returns absolute value of negative categories', () => {
    const points = {
      disads: -50,
      quirks: -10,
    }
    expect(calculateNegativePoints(points)).toBe(60)
  })

  test('handles string values', () => {
    const points = {
      disads: '-50',
      quirks: '-10',
    }
    expect(calculateNegativePoints(points)).toBe(60)
  })

  test('includes negative race points', () => {
    const points = {
      disads: -50,
      race: -25,
    }
    expect(calculateNegativePoints(points)).toBe(75)
  })

  test('excludes positive race points', () => {
    const points = {
      disads: -50,
      race: 25,
    }
    expect(calculateNegativePoints(points)).toBe(50)
  })

  test('handles undefined values as 0', () => {
    const points = {
      disads: -50,
      quirks: undefined,
    }
    expect(calculateNegativePoints(points)).toBe(50)
  })

  test('handles non-numeric strings as 0', () => {
    const points = {
      disads: 'invalid',
      quirks: -10,
    }
    expect(calculateNegativePoints(points as any)).toBe(10)
  })
})
