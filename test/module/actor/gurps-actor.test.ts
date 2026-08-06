import { CharacterModel } from '@module/actor/data/character.js'
import { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import { ActorType } from '@module/actor/types.js'
import { parseItemKey } from '@util/object-utils.js'

describe('GurpsActorV2', () => {
  let actor: Actor.OfType<ActorType.Character>

  beforeEach(() => {
    // Ensure minimal globals exist
    global.GURPS = global.GURPS || { module: {} }
    // @ts-expect-error - mock for testing
    global.game = global.game || {}

    // Instantiate with minimal data that our test base Actor supports
    actor = new GurpsActorV2({ name: 'Test Actor', type: ActorType.Character })
    actor.system = new CharacterModel()
    // @ts-expect-error - mock for testing
    actor.system._source = { allNotes: [], moveV2: [] }
  })

  it('can be instantiated', () => {
    expect(actor).toBeInstanceOf(GurpsActorV2)
    expect(actor.name).toBe('Test Actor')
    expect(actor.type).toBe(ActorType.Character)
  })

  describe('updating synthetic Actor pseudo-documents', () => {
    const trackerId = 'TRACKER_ID'
    const trackerSource = {
      _id: trackerId,
      name: 'Energy Reserve',
      alias: 'ER',
      currentValue: 8,
      max: 10,
      min: 0,
    }

    function configureSyntheticActor() {
      const deltaUpdate = vi.fn().mockResolvedValue(undefined)

      Object.defineProperties(actor, {
        isToken: { value: true, configurable: true },
        token: {
          value: { delta: { update: deltaUpdate } },
          configurable: true,
        },
        _source: {
          value: {
            system: {
              additionalresources: {
                tracker: { [trackerId]: trackerSource },
              },
            },
          },
          configurable: true,
        },
      })

      return deltaUpdate
    }

    it('hydrates a changed pseudo-document directly into the ActorDelta', async () => {
      const deltaUpdate = configureSyntheticActor()

      // @ts-expect-error - LSP doesn't like the path but it's valid.
      await actor.update({ [`system.additionalresources.tracker.${trackerId}.currentValue`]: 8 })

      expect(deltaUpdate).toHaveBeenCalledOnce()
      expect(deltaUpdate).toHaveBeenCalledWith(
        { [`system.additionalresources.tracker.${trackerId}`]: trackerSource },
        { diff: false, recursive: true, render: undefined }
      )
    })

    it('recognizes nested update data', async () => {
      const deltaUpdate = configureSyntheticActor()

      await actor.update({
        system: {
          additionalresources: {
            tracker: { [trackerId]: { currentValue: 8 } },
          },
        },
      })

      expect(deltaUpdate).toHaveBeenCalledOnce()
    })

    it('does not hydrate unrelated Actor changes', async () => {
      const deltaUpdate = configureSyntheticActor()

      await actor.update({ name: 'Changed Name' })

      expect(deltaUpdate).not.toHaveBeenCalled()
    })

    it('does not hydrate a deleted pseudo-document', async () => {
      const deltaUpdate = configureSyntheticActor()

      Object.defineProperty(actor, '_source', {
        value: { system: { additionalresources: { tracker: {} } } },
        configurable: true,
      })

      // @ts-expect-error - LSP doesn't like the path but it's valid.
      await actor.update({ [`system.additionalresources.tracker.${trackerId}`]: null })

      expect(deltaUpdate).not.toHaveBeenCalled()
    })
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
