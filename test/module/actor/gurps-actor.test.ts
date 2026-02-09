import { CharacterModel } from '@module/actor/data/character.js'
import { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import { parseItemKey } from '@module/util/object-utils.js'

describe('GurpsActorV2', () => {
  let actor: GurpsActorV2<'characterV2'>

  beforeEach(() => {
    // Ensure minimal globals exist
    global.GURPS = global.GURPS || { module: {} }
    // @ts-expect-error - mock for testing
    global.game = global.game || {}

    // Instantiate with minimal data that our test base Actor supports
    actor = new GurpsActorV2({ name: 'Test Actor', type: 'characterV2' })
    actor.system = new CharacterModel()
    // @ts-expect-error - mock for testing
    actor.system._source = { allNotes: [], moveV2: [] }
  })

  it('can be instantiated', () => {
    expect(actor).toBeInstanceOf(GurpsActorV2)
    expect(actor.name).toBe('Test Actor')
    expect(actor.type).toBe('characterV2')
  })

  describe('parseItemKey', () => {
    it('parses a simple collection path', () => {
      const result = parseItemKey('system.ads')

      expect(result).toEqual(['system.ads', 0, '', undefined])
    })

    it('parses a collection path with numeric index', () => {
      const result = parseItemKey('system.ads.5')

      expect(result).toEqual(['system.ads', 5, '', undefined])
    })

    it('parses a collection path with index and property', () => {
      const result = parseItemKey('system.ads.3.name')

      expect(result).toEqual(['system.ads', 3, '', 'name'])
    })

    it('parses equipment collection with three components', () => {
      const result = parseItemKey('system.equipmentV2.carried')

      expect(result).toEqual(['system.equipmentV2.carried', 0, '', undefined])
    })

    it('parses equipment collection with index', () => {
      const result = parseItemKey('system.equipmentV2.carried.2')

      expect(result).toEqual(['system.equipmentV2.carried', 2, '', undefined])
    })

    it('parses equipment collection with index and property', () => {
      const result = parseItemKey('system.equipmentV2.other.1.name')

      expect(result).toEqual(['system.equipmentV2.other', 1, '', 'name'])
    })

    it('parses nested path with contains', () => {
      const result = parseItemKey('system.ads.2.contains.5')

      expect(result).toEqual(['system.ads', 5, '2.contains', undefined])
    })

    it('parses nested path with contains and property', () => {
      const result = parseItemKey('system.ads.1.contains.3.name')

      expect(result).toEqual(['system.ads', 3, '1.contains', 'name'])
    })

    it('parses equipment nested path with contains', () => {
      const result = parseItemKey('system.equipmentV2.carried.0.contains.2')

      expect(result).toEqual(['system.equipmentV2.carried', 2, '0.contains', undefined])
    })

    it('parses equipment deeply nested path', () => {
      const result = parseItemKey('system.equipmentV2.other.1.contains.2.contains.3.name')

      expect(result).toEqual(['system.equipmentV2.other', 3, '1.contains.2.contains', 'name'])
    })

    it('parses path with middle non-numeric component', () => {
      const result = parseItemKey('system.ads.modifier.3.value')

      expect(result).toEqual(['system.ads', 3, 'modifier', 'value'])
    })

    // Legacy tests.
    it('parses a legacy collection path with numeric index', () => {
      const result = parseItemKey('system.ads.00005')

      expect(result).toEqual(['system.ads', 5, '', undefined])
    })

    it('parses a legacy collection path with index and property', () => {
      const result = parseItemKey('system.ads.00003.name')

      expect(result).toEqual(['system.ads', 3, '', 'name'])
    })

    it('parses legacy equipment collection with index', () => {
      const result = parseItemKey('system.equipmentV2.carried.00002')

      expect(result).toEqual(['system.equipmentV2.carried', 2, '', undefined])
    })

    it('parses legacy equipment collection with index and property', () => {
      const result = parseItemKey('system.equipmentV2.other.00001.name')

      expect(result).toEqual(['system.equipmentV2.other', 1, '', 'name'])
    })

    it('parses legacy nested path with contains', () => {
      const result = parseItemKey('system.ads.00002.contains.00005')

      expect(result).toEqual(['system.ads', 5, '00002.contains', undefined])
    })

    it('parses legacy nested path with contains and property', () => {
      const result = parseItemKey('system.ads.00001.contains.00003.name')

      expect(result).toEqual(['system.ads', 3, '00001.contains', 'name'])
    })

    it('parses legacy equipment nested path with contains', () => {
      const result = parseItemKey('system.equipmentV2.carried.00000.contains.2')

      expect(result).toEqual(['system.equipmentV2.carried', 2, '00000.contains', undefined])
    })

    it('parses legacy equipment deeply nested path', () => {
      const result = parseItemKey('system.equipmentV2.other.00001.contains.00002.contains.00003.name')

      expect(result).toEqual(['system.equipmentV2.other', 3, '00001.contains.00002.contains', 'name'])
    })

    it('parses legacy path with middle non-numeric component', () => {
      const result = parseItemKey('system.ads.modifier.00003.value')

      expect(result).toEqual(['system.ads', 3, 'modifier', 'value'])
    })
  })
})
