import { collectDeletions, type EntryData } from '../module/actor/deletion.ts'

describe('collectDeletions', () => {
  test('returns single item for flat data', () => {
    const data: EntryData = { itemid: 'item0' }

    const result = collectDeletions(data, 'system.skills.00000')

    expect(result).toEqual([{ path: 'system.skills.00000', itemid: 'item0' }])
  })

  test('handles data without itemid', () => {
    const data: EntryData = {}

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([{ path: 'base', itemid: undefined }])
  })

  test('collects contains children before parent', () => {
    const data: EntryData = {
      itemid: 'parent',
      contains: {
        '00000': { itemid: 'child0' },
        '00001': { itemid: 'child1' },
      },
    }

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([
      { path: 'base.contains.00001', itemid: 'child1' },
      { path: 'base.contains.00000', itemid: 'child0' },
      { path: 'base', itemid: 'parent' },
    ])
  })

  test('collects collapsed children before parent', () => {
    const data: EntryData = {
      itemid: 'parent',
      collapsed: {
        '00000': { itemid: 'collapsed0' },
        '00001': { itemid: 'collapsed1' },
      },
    }

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([
      { path: 'base.collapsed.00001', itemid: 'collapsed1' },
      { path: 'base.collapsed.00000', itemid: 'collapsed0' },
      { path: 'base', itemid: 'parent' },
    ])
  })

  test('processes contains before collapsed at same level', () => {
    const data: EntryData = {
      itemid: 'parent',
      contains: { '00000': { itemid: 'contained' } },
      collapsed: { '00000': { itemid: 'collapsed' } },
    }

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([
      { path: 'base.contains.00000', itemid: 'contained' },
      { path: 'base.collapsed.00000', itemid: 'collapsed' },
      { path: 'base', itemid: 'parent' },
    ])
  })

  test('handles deeply nested structure (3 levels)', () => {
    const data: EntryData = {
      itemid: 'root',
      contains: {
        '00000': {
          itemid: 'level1',
          collapsed: {
            '00000': { itemid: 'level2' },
          },
        },
      },
    }

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([
      { path: 'base.contains.00000.collapsed.00000', itemid: 'level2' },
      { path: 'base.contains.00000', itemid: 'level1' },
      { path: 'base', itemid: 'root' },
    ])
  })

  test('returns items in reverse key order for safe index-based deletion', () => {
    const data: EntryData = {
      itemid: 'parent',
      contains: {
        '00000': { itemid: 'first' },
        '00001': { itemid: 'second' },
        '00002': { itemid: 'third' },
      },
    }

    const result = collectDeletions(data, 'base')

    expect(result.map(item => item.path)).toEqual([
      'base.contains.00002',
      'base.contains.00001',
      'base.contains.00000',
      'base',
    ])
  })

  test('handles empty contains and collapsed objects', () => {
    const data: EntryData = {
      itemid: 'item',
      contains: {},
      collapsed: {},
    }

    const result = collectDeletions(data, 'base')

    expect(result).toEqual([{ path: 'base', itemid: 'item' }])
  })

  test('no duplicate paths when contains and collapsed have same keys', () => {
    const data: EntryData = {
      itemid: 'parent',
      contains: { '00000': { itemid: 'c1' } },
      collapsed: { '00000': { itemid: 'c2' } },
    }

    const result = collectDeletions(data, 'base')

    const paths = result.map(item => item.path)
    expect(paths).toEqual([
      'base.contains.00000',
      'base.collapsed.00000',
      'base',
    ])
  })

  test('real-world equipment structure with nested container', () => {
    const data: EntryData = {
      itemid: 'backpack-item-id',
      contains: {
        '00000': { itemid: 'rope-item-id' },
        '00001': {
          itemid: 'pouch-item-id',
          collapsed: {
            '00000': { itemid: 'coins-item-id' },
          },
        },
      },
    }

    const result = collectDeletions(data, 'system.equipment.carried.00003')

    expect(result).toEqual([
      { path: 'system.equipment.carried.00003.contains.00001.collapsed.00000', itemid: 'coins-item-id' },
      { path: 'system.equipment.carried.00003.contains.00001', itemid: 'pouch-item-id' },
      { path: 'system.equipment.carried.00003.contains.00000', itemid: 'rope-item-id' },
      { path: 'system.equipment.carried.00003', itemid: 'backpack-item-id' },
    ])
  })

  test('root path is always last in the result', () => {
    const data: EntryData = {
      itemid: 'root',
      contains: {
        '00000': {
          itemid: 'child',
          contains: {
            '00000': { itemid: 'grandchild' },
          },
        },
      },
    }

    const result = collectDeletions(data, 'system.ads.00018')

    expect(result[result.length - 1].path).toBe('system.ads.00018')
  })

  test('advantage with nested alternate ability structure', () => {
    const data: EntryData = {
      itemid: '',
      contains: {
        '00000': {
          itemid: '',
          contains: {},
        },
      },
    }

    const result = collectDeletions(data, 'system.ads.00018')

    expect(result).toEqual([
      { path: 'system.ads.00018.contains.00000', itemid: '' },
      { path: 'system.ads.00018', itemid: '' },
    ])
  })

  test('collects all itemids for Foundry item cleanup', () => {
    const data: EntryData = {
      itemid: 'parent-item',
      contains: {
        '00000': { itemid: 'child-item-1' },
        '00001': { itemid: 'child-item-2' },
      },
    }

    const result = collectDeletions(data, 'base')

    const itemids = result.map(item => item.itemid).filter(Boolean)
    expect(itemids).toContain('parent-item')
    expect(itemids).toContain('child-item-1')
    expect(itemids).toContain('child-item-2')
  })
})
