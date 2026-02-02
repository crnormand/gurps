import { prepareRemoveKey } from '../../../module/actor/deletion.ts'

describe('prepareRemoveKey', () => {
  test('removes key from middle and reindexes', () => {
    const object = {
      '00000': { name: 'first' },
      '00001': { name: 'second' },
      '00002': { name: 'third' },
    }

    const result = prepareRemoveKey('system.ads.00001', object)

    expect(result).toEqual({
      deleteKey: 'system.-=ads',
      objectPath: 'system.ads',
      updatedObject: {
        '00000': { name: 'first' },
        '00001': { name: 'third' },
      },
    })
  })

  test('removes last key without reindexing', () => {
    const object = {
      '00000': { name: 'first' },
      '00001': { name: 'second' },
    }

    const result = prepareRemoveKey('system.skills.00001', object)

    expect(result).toEqual({
      deleteKey: 'system.-=skills',
      objectPath: 'system.skills',
      updatedObject: {
        '00000': { name: 'first' },
      },
    })
  })

  test('removes first key and shifts all', () => {
    const object = {
      '00000': { name: 'first' },
      '00001': { name: 'second' },
      '00002': { name: 'third' },
    }

    const result = prepareRemoveKey('system.ads.00000', object)

    expect(result).toEqual({
      deleteKey: 'system.-=ads',
      objectPath: 'system.ads',
      updatedObject: {
        '00000': { name: 'second' },
        '00001': { name: 'third' },
      },
    })
  })

  test('removes only key leaving empty object', () => {
    const object = {
      '00000': { name: 'only' },
    }

    const result = prepareRemoveKey('system.ads.00000', object)

    expect(result).toEqual({
      deleteKey: 'system.-=ads',
      objectPath: 'system.ads',
      updatedObject: {},
    })
  })

  test('handles nested equipment path', () => {
    const object = {
      '00000': { name: 'item1' },
      '00001': { name: 'item2' },
    }

    const result = prepareRemoveKey('system.equipment.carried.00000', object)

    expect(result).toEqual({
      deleteKey: 'system.equipment.-=carried',
      objectPath: 'system.equipment.carried',
      updatedObject: {
        '00000': { name: 'item2' },
      },
    })
  })

  test('handles deeply nested contains path', () => {
    const object = {
      '00000': { name: 'child' },
    }

    const result = prepareRemoveKey('system.ads.00018.contains.00000', object)

    expect(result).toEqual({
      deleteKey: 'system.ads.00018.-=contains',
      objectPath: 'system.ads.00018.contains',
      updatedObject: {},
    })
  })

  test('preserves complex nested data when reindexing', () => {
    const object = {
      '00000': { name: 'keep', contains: { nested: 'data' }, points: 10 },
      '00001': { name: 'remove' },
      '00002': { name: 'shift', notes: 'important' },
    }

    const result = prepareRemoveKey('system.ads.00001', object)

    expect(result.updatedObject).toEqual({
      '00000': { name: 'keep', contains: { nested: 'data' }, points: 10 },
      '00001': { name: 'shift', notes: 'important' },
    })
  })

  test('does not mutate original object', () => {
    const object = {
      '00000': { name: 'first' },
      '00001': { name: 'second' },
    }
    const originalKeys = Object.keys(object)

    prepareRemoveKey('system.ads.00000', object)

    expect(Object.keys(object)).toEqual(originalKeys)
  })

  test('handles gap in indices - does not shift across gap', () => {
    const object = {
      '00000': { name: 'first' },
      '00002': { name: 'third' },
    }

    const result = prepareRemoveKey('system.ads.00000', object)

    expect(result.updatedObject).toEqual({
      '00002': { name: 'third' },
    })
  })

  test('shifts multiple consecutive keys', () => {
    const object = {
      '00000': { name: 'a' },
      '00001': { name: 'b' },
      '00002': { name: 'c' },
      '00003': { name: 'd' },
      '00004': { name: 'e' },
    }

    const result = prepareRemoveKey('system.ads.00001', object)

    expect(result.updatedObject).toEqual({
      '00000': { name: 'a' },
      '00001': { name: 'c' },
      '00002': { name: 'd' },
      '00003': { name: 'e' },
    })
  })

  test('returns correct Foundry delete key format', () => {
    const object = { '00000': {} }

    const result = prepareRemoveKey('system.spells.00000', object)

    expect(result.deleteKey).toBe('system.-=spells')
  })

  test('handles high index numbers', () => {
    const object = {
      '00017': { name: 'item17' },
      '00018': { name: 'item18' },
      '00019': { name: 'item19' },
    }

    const result = prepareRemoveKey('system.ads.00017', object)

    expect(result.updatedObject).toEqual({
      '00017': { name: 'item18' },
      '00018': { name: 'item19' },
    })
  })
})
