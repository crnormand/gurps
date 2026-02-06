import { jest } from '@jest/globals'

import { CharacterModel } from '../../../module/actor/data/character.js'
import { GurpsActorV2 } from '../../../module/actor/gurps-actor.js'
import { GurpsItemV2 } from '../../../module/item/gurps-item.js'

describe('GurpsActorV2.moveItem', () => {
  let actor: GurpsActorV2<'characterV2'>
  let equipmentItems: GurpsItemV2<'equipmentV2'>[]
  let EquipmentModel: any
  let equipmentData: any

  beforeEach(async () => {
    // Ensure minimal globals exist
    global.GURPS = global.GURPS || { module: {} }
    // @ts-expect-error - game is a partial mock for testing
    global.game = global.game || {}

    // Import EquipmentModel
    EquipmentModel = (await import('../../../module/item/data/equipment.js')).EquipmentModel

    // Mock game.settings for updateEqtCountV2
    // @ts-expect-error - game is a partial mock for testing
    if (!global.game.settings) {
      // @ts-expect-error - game is a partial mock for testing
      global.game.settings = {
        get: jest.fn().mockReturnValue(false), // Default to false for settings
      }
    }

    // Instantiate with minimal data that our test base Actor supports
    actor = new GurpsActorV2({ name: 'Test Actor', type: 'characterV2' })
    actor.system = new CharacterModel()
    // @ts-expect-error - _source is a private property being set for testing
    actor.system._source = { allNotes: [], moveV2: [] }

    // Mock updateEmbeddedDocuments to track calls
    jest.spyOn(actor, 'updateEmbeddedDocuments').mockResolvedValue([] as any)

    // Mock resolveDropPosition to return 'before' by default
    jest.spyOn(actor as any, 'resolveDropPosition').mockResolvedValue('before')

    // Mock toggleExpand
    jest.spyOn(actor, 'toggleExpand').mockResolvedValue(undefined)

    equipmentData = {
      containedBy: null,
      eqt: {
        carried: true,
        equipped: false,
        count: 1,
        weight: 0,
        cost: 0,
        location: '',
        techlevel: '',
        categories: '',
        legalityclass: '',
        costsum: 0,
        weightsum: '',
        uses: 0,
        maxuses: 0,
        originalCount: '',
        ignoreImportQty: false,
      },
    }

    // Create test equipment items
    equipmentItems = [
      new GurpsItemV2({
        _id: 'eq1',
        name: 'Sword',
        type: 'equipmentV2',
        sort: 0,
        system: new EquipmentModel(equipmentData),
      }),
      new GurpsItemV2({
        _id: 'eq2',
        name: 'Backpack',
        type: 'equipmentV2',
        sort: 1,
        system: new EquipmentModel(equipmentData),
      }),
      new GurpsItemV2({
        _id: 'eq2.1',
        name: 'Rope',
        type: 'equipmentV2',
        sort: 0,
        system: new EquipmentModel({
          ...equipmentData,
          containedBy: 'eq2',
        }),
      }),
      new GurpsItemV2({
        _id: 'eq3',
        name: 'Helmet',
        type: 'equipmentV2',
        sort: 2,
        system: new EquipmentModel(equipmentData),
      }),
    ]

    // Set up the items on the actor - equipmentV2 is a computed getter
    // that derives from actor.items filtered by type and carried status
    equipmentItems.forEach(item => {
      // @ts-expect-error: ignore parent type
      item.actor = actor
      // @ts-expect-error: ignore parent type
      item.system.parent = item

      // Add toObject method for splitting functionality
      // @ts-expect-error: adding mock method
      item.toObject = () => {
        return {
          _id: item._id,
          name: item.name,
          type: item.type,
          sort: item.sort,
          system: {
            containedBy: item.system.containedBy,
            eqt: { ...item.system.eqt },
          },
        }
      }
    })

    // Mock actor.items to return our equipment
    const itemsCollection = {
      contents: equipmentItems,
      get: (id: string) => itemsCollection.contents.find((item: any) => item.id === id),
      filter: (predicate: (item: any) => boolean) => itemsCollection.contents.filter(predicate),
    }

    Object.defineProperty(actor, 'items', {
      value: itemsCollection,
      writable: true,
      configurable: true,
    })

    // Set up allEquipmentV2 which is used by equipmentV2 getter
    actor.system.allEquipmentV2 = equipmentItems
  })

  it('is setup correctly', () => {
    expect(actor.system.allEquipmentV2.length).toBe(4)
    expect(actor.system.equipmentV2.carried.length).toBe(3)
    expect(actor.system.equipmentV2.other.length).toBe(0)
    expect(actor.system.equipmentV2.carried[1].contains.length).toBe(1)
  })

  it('returns early if source and target keys are identical', async () => {
    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.0')
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled()
  })

  it('throws error when moving between incompatible collections', async () => {
    await expect(actor.moveItem('system.equipmentV2.carried.0', 'system.ads.0')).rejects.toThrow(
      /Cannot reorder items between different collections/
    )
  })

  it('returns early if user cancels the dialog', async () => {
    setDropPosition(actor, null)

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1')

    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled()
  })

  it('moves item before target in same array', async () => {
    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.carried.1', 'system.equipmentV2.carried.0')

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({ _id: 'eq2', sort: 0 }),
        expect.objectContaining({ _id: 'eq1', sort: 1 }),
        expect.objectContaining({ _id: 'eq3', sort: 2 }),
      ]),
      expect.any(Object)
    )
  })

  it('moves item inside a container', async () => {
    setDropPosition(actor, 'inside')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1')

    expect(actor.toggleExpand).toHaveBeenCalledWith('system.equipmentV2.carried.1', true)
    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({
          _id: 'eq1',
          system: expect.objectContaining({
            containedBy: 'eq2',
          }),
        }),
      ]),
      expect.any(Object)
    )
  })

  it('updates carried status when moving from other to carried', async () => {
    const otherItem = new GurpsItemV2<'equipmentV2'>({
      _id: 'eq4',
      name: 'Shield',
      type: 'equipmentV2',
      sort: 0,
      system: new EquipmentModel({
        ...equipmentData,
        eqt: {
          carried: false, // Add to "Other" (i.e., not carried).
        },
      }),
    })

    otherItem.parent = actor
    actor.system.allEquipmentV2.push(otherItem)

    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.other.0', 'system.equipmentV2.carried.0')

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({
          _id: 'eq4',
          system: expect.objectContaining({
            eqt: { carried: true },
          }),
        }),
      ]),
      expect.any(Object)
    )
  })

  it('updates carried status when moving from carried to other', async () => {
    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.other')

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({
          _id: 'eq1',
          system: expect.objectContaining({
            eqt: expect.objectContaining({ carried: false }),
          }),
        }),
      ]),
      expect.any(Object)
    )
  })

  it('adjusts target index when source comes before target', async () => {
    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.2')

    const calls = (actor.updateEmbeddedDocuments as jest.Mock).mock.calls[0]
    const updates = calls[1] as any[]

    // When moving eq1 before eq3, eq2.sort === 0, eq1.sort === 1, and eq3.sort === 2.
    expectItemIdAtSortIndex(updates, 'eq2', 0)
    expectItemIdAtSortIndex(updates, 'eq1', 1)
    expectItemIdAtSortIndex(updates, 'eq3', 2)
  })

  it('adds item to end of array when dropping on collection', async () => {
    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried')

    const calls = (actor.updateEmbeddedDocuments as jest.Mock).mock.calls[0]
    const updates = calls[1] as any[]

    expectItemIdAtSortIndex(updates, 'eq2', 0)
    expectItemIdAtSortIndex(updates, 'eq3', 1)
    expectItemIdAtSortIndex(updates, 'eq1', 2)
  })

  it('adds item to end of array when dropping on an embedded collection', async () => {
    setDropPosition(actor, 'inside')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1')

    const updates = getUpdates(actor)

    // Expect eq1 to be containedBy eq2 and at the end of the embedded array.
    const movedItem = updates.find((e: any) => e._id === 'eq1')

    expect(movedItem.system.containedBy).toBe('eq2')
    expect(movedItem.sort).toBe(1)
  })

  it('updates sort order for all items in source array', async () => {
    setDropPosition(actor, 'inside')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1')

    const updates = getUpdates(actor)

    // Both items should have sort updates
    expect(updates.length).toBe(4)
    expectItemIdAtSortIndex(updates, 'eq2', 0)
    expectItemIdAtSortIndex(updates, 'eq3', 1)
    expectItemIdAtSortIndex(updates, 'eq2.1', 0)
    expectItemIdAtSortIndex(updates, 'eq1', 1)
  })

  it('updates sort order for items in both arrays when moving between arrays', async () => {
    const otherItem = new GurpsItemV2({
      _id: 'eq4',
      name: 'Shield',
      type: 'equipmentV2',
      sort: 0,
      system: new EquipmentModel({
        ...equipmentData,
        containedBy: null,
        eqt: {
          carried: false,
        },
      }),
    })

    otherItem.parent = actor

    actor.system.allEquipmentV2.push(otherItem as any)

    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.other.0', 'system.equipmentV2.carried.0')

    const updates = getUpdates(actor)

    // All three items should get sort updates
    expect(updates.length).toBeGreaterThanOrEqual(3)
  })

  it('sets containedBy to null when moving out of container', async () => {
    setDropPosition(actor, 'before')

    await actor.moveItem('system.equipmentV2.carried.1.contains.0', 'system.equipmentV2.carried.0')

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({
          _id: 'eq2.1',
          system: expect.objectContaining({
            containedBy: null,
          }),
        }),
      ]),
      expect.any(Object)
    )
  })

  it('splits count when moving to another container', async () => {
    // Set up the source item with a count of 5
    actor.system.allEquipmentV2[0].system.eqt.count = 5

    setEquipmentQuantity(actor, 2)
    setDropPosition(actor, 'inside')

    // Mock createEmbeddedDocuments to track the new item creation
    const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments').mockResolvedValue([
      {
        id: 'eq1-split',
        _id: 'eq1-split',
        name: 'Sword',
        type: 'equipmentV2',
      } as any,
    ])

    // Call moveItem with split=true
    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1', true)

    // Verify createEmbeddedDocuments was called to create the split item
    expect(createSpy).toHaveBeenCalledWith(
      'Item',
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Sword',
          type: 'equipmentV2',
          system: expect.objectContaining({
            containedBy: 'eq2', // Inside the backpack
            eqt: expect.objectContaining({
              count: 2, // The split quantity
              carried: true,
            }),
          }),
        }),
      ]),
      expect.objectContaining({ parent: actor })
    )

    // Verify updateEmbeddedDocuments was called to reduce the source item count
    const updateCalls = (actor.updateEmbeddedDocuments as jest.Mock).mock.calls
    const countUpdateCall = updateCalls.find(
      (call: any) =>
        call[0] === 'Item' && call[1].some((update: any) => update._id === 'eq1' && update.system?.eqt?.count === 3)
    )

    expect(countUpdateCall).toBeDefined()
  })

  it('does not split if user cancels the quantity prompt', async () => {
    setDropPosition(actor, 'inside')

    actor.system.allEquipmentV2[0].system.eqt.count = 5

    // Mock promptEquipmentQuantity to return null (user cancelled)
    jest.spyOn(actor as any, 'promptEquipmentQuantity').mockResolvedValue(null)

    const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1', true)

    // Verify no new item was created
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('does not split if quantity is zero or negative', async () => {
    actor.system.allEquipmentV2[0].system.eqt.count = 5

    setDropPosition(actor, 'inside')
    setEquipmentQuantity(actor, 0)

    const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1', true)

    // Verify no new item was created
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('does not split if item has count of 1 or less', async () => {
    setDropPosition(actor, 'inside')

    actor.system.allEquipmentV2[0].system.eqt.count = 1

    const promptSpy = jest.spyOn(actor as any, 'promptEquipmentQuantity')
    const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1', true)

    expect(promptSpy).not.toHaveBeenCalled()
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('performs move instead of split if quantity equals or exceeds source count', async () => {
    actor.system.allEquipmentV2[0].system.eqt.count = 5

    setDropPosition(actor, 'inside')
    setEquipmentQuantity(actor, 5)

    const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments')

    await actor.moveItem('system.equipmentV2.carried.0', 'system.equipmentV2.carried.1', true)

    // Should not create a split item, should proceed with normal move
    // (The createEmbeddedDocuments from split won't be called, but updateEmbeddedDocuments for move will be)
    expect(createSpy).not.toHaveBeenCalled()
  })
})

// Helper functions
function setEquipmentQuantity(actor: GurpsActorV2<'characterV2'>, value: number) {
  jest.spyOn(actor as any, 'promptEquipmentQuantity').mockResolvedValue(value)
}

function getUpdates(actor: GurpsActorV2<'characterV2'>) {
  const calls = (actor.updateEmbeddedDocuments as jest.Mock).mock.calls[0]
  const updates = calls[1] as any[]

  return updates
}

function expectItemIdAtSortIndex(updates: any[], itemId: string, sortIndex: number) {
  expect(updates).toContainEqual(expect.objectContaining({ _id: itemId, sort: sortIndex }))
}

function setDropPosition(actor: GurpsActorV2<'characterV2'>, value: string | null) {
  jest.spyOn(actor as any, 'resolveDropPosition').mockResolvedValue(value)
}
