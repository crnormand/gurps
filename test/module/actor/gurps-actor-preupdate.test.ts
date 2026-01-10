import { jest } from '@jest/globals'

import { CharacterModel } from '../../../module/actor/data/character.js'
import { GurpsActorV2 } from '../../../module/actor/gurps-actor.js'
import { TraitModel } from '../../../module/item/data/trait.js'
import { GurpsItemV2 } from '../../../module/item/gurps-item.js'
import { _Collection } from '../../foundry-utils/collection.js'

describe('GurpsActorV2._preUpdate', () => {
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

  it('does not transform non-legacy data', async () => {
    const updateData = { name: 'Updated Actor' }

    // @ts-expect-error - testing protected method
    await actor._preUpdate(updateData, {}, {})

    expect(updateData).toBe(updateData)
  })

  describe('translate legacy Ads data', () => {
    beforeEach(() => {
      const allAds = [
        new GurpsItemV2({
          _id: 'ad1',
          name: 'Ad 1',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: null,
          }),
        }),
        new GurpsItemV2({
          _id: 'ad2',
          name: 'Ad 2',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: null,
          }),
        }),
        new GurpsItemV2({
          _id: 'ad3',
          name: 'Ad 3',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: null,
          }),
        }),
        new GurpsItemV2({
          _id: 'ad2.1',
          name: 'Ad 2.1',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: 'ad2',
          }),
        }),
        new GurpsItemV2({
          _id: 'ad2.2',
          name: 'Ad 2.2',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: 'ad2',
          }),
        }),
        new GurpsItemV2({
          _id: 'ad2.2.1',
          name: 'Ad 2.2.1',
          type: 'featureV2',
          system: new TraitModel({
            containedBy: 'ad2.2',
          }),
        }),
      ]

      // Mock the actor's items collection for testing: actor.items should return our test ads.
      const itemsCollection = new _Collection()

      allAds.forEach(ad => itemsCollection.set(ad._id!, ad))
      Object.defineProperty(actor, 'items', {
        get: jest.fn(() => itemsCollection),
        configurable: true,
      })
    })

    it('converts a request to remove the entire ads array with calls to Actor.deleteEmbeddedDocuments', async () => {
      const deleteEmbeddedDocuments = jest.spyOn(actor, 'deleteEmbeddedDocuments').mockResolvedValue([])
      const updateData: Record<string, any> = { system: { '-=ads': null } }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).includes('-=ads')).toBe(false)
      expect(deleteEmbeddedDocuments).toHaveBeenCalledTimes(1)
      expect(deleteEmbeddedDocuments).toHaveBeenCalledWith('Item', ['ad1', 'ad2', 'ad3', 'ad2.1', 'ad2.2', 'ad2.2.1'])
    })

    it('can insert new Ads', async () => {
      const createSpy = jest.spyOn(actor, 'createEmbeddedDocuments').mockResolvedValue([] as any)
      const updateData = {
        system: {
          ads: {
            '00004': {
              save: false,
              addToQuickRoll: true,
              collapsed: {},
              contains: {},
              cr: 15,
              disabled: true,
              fromItem: null,
              hasContains: false,
              hasCollapsed: false,
              itemModifiers: 'mod1, mod2',
              itemid: 'Qfp10Etwg9779H9l',
              level: 10,
              modifierTags: '@tag1, @tag2, @tag3',
              name: 'Always says "Hail, and Well Met!"',
              notes: 'Some kind of notes.',
              originalName: 'Always says "Hail, and Well Met!"',
              pageref: 'DFA68',
              parentuuid: null,
              points: -1,
              uuid: 'Actor.f9wRCqt63iE2YyTI.Item.Qfp10Etwg9779H9l',
            },
          },
        },
      }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(createSpy).toHaveBeenCalledWith('Item', [
        {
          _id: 'Qfp10Etwg9779H9l',
          type: 'featureV2',
          name: 'Always says "Hail, and Well Met!"',
          sort: 3,
          system: {
            addToQuickRoll: true,
            open: true,
            disabled: true,
            itemModifiers: 'mod1, mod2',
            modifierTags: '@tag1, @tag2, @tag3',
            containedBy: null,
            fea: {
              cr: 15,
              level: 10,
              name: 'Always says "Hail, and Well Met!"',
              notes: 'Some kind of notes.',
              pageref: 'DFA68',
              vtt_notes: '',
              points: -1,
            },
          },
        },
      ])
      expect(Object.keys(updateData.system).includes('ads')).toBe(false)
    })
  })

  describe('translate legacy Move data', () => {
    it('converts a request to remove the entire move array with an empty array on MoveV2', async () => {
      const updateData: Record<string, any> = { system: { '-=move': null } }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('moveV2')
      expect(updateData.system.moveV2).toStrictEqual([])
    })

    it('transforms legacy move data to moveV2', async () => {
      actor.system.moveV2 = []
      const updateData: Record<string, any> = {
        system: {
          move: {
            '00000': {
              mode: 'Ground',
              basic: 3,
              enhanced: 4,
              default: true,
            },
            '00001': {
              mode: 'Water',
              basic: 1,
              enhanced: 2,
              default: false,
            },
            '00002': {
              mode: 'Air',
              basic: 5,
              enhanced: 6,
              default: false,
            },
          },
        },
      }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('moveV2')
      expect(updateData.system.moveV2).toEqual([
        { mode: 'Ground', basic: 3, enhanced: 4, default: true },
        { mode: 'Water', basic: 1, enhanced: 2, default: false },
        { mode: 'Air', basic: 5, enhanced: 6, default: false },
      ])
    })

    it("updates the entire move2 array if any element's data is updated", async () => {
      // Set initial moveV2 data.
      actor.system._source.moveV2 = [
        { mode: 'Ground', basic: 6, enhanced: 12, default: true },
        { mode: 'Water', basic: 1, enhanced: null, default: false },
        { mode: 'Air', basic: 12, enhanced: 24, default: false },
      ]
      actor.system.moveV2 = actor.system._source.moveV2

      const updateData: Record<string, any> = { system: { move: { '00001': { basic: 10 } } } }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system)).toContain('moveV2')
      expect(updateData.system.moveV2).toEqual([
        { mode: 'Ground', basic: 6, enhanced: 12, default: true },
        { mode: 'Water', basic: 10, enhanced: null, default: false },
        { mode: 'Air', basic: 12, enhanced: 24, default: false },
      ])
    })

    it('updates the entire move2 array if any element is replaced', async () => {
      // Set initial moveV2 data.
      actor.system = { _source: { moveV2: [] } } as any
      actor.system._source.moveV2 = [
        { mode: 'Ground', basic: 6, enhanced: 12, default: true },
        { mode: 'Water', basic: 1, enhanced: null, default: false },
        { mode: 'Air', basic: 12, enhanced: 24, default: false },
      ]
      actor.system.moveV2 = actor.system._source.moveV2

      const updateData: Record<string, any> = {
        system: {
          move: {
            '00001': {
              mode: 'Space',
              basic: 10,
              enhanced: 20,
              default: false,
            },
          },
        },
      }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('moveV2')
      expect(updateData.system.moveV2).toEqual([
        { mode: 'Ground', basic: 6, enhanced: 12, default: true },
        { mode: 'Space', basic: 10, enhanced: 20, default: false },
        { mode: 'Air', basic: 12, enhanced: 24, default: false },
      ])
    })
  })

  describe('translate legacy Note data', () => {
    beforeEach(() => {
      const allNotes = [
        { id: 'note1', text: 'Note 1', open: true, containedBy: null, parent: actor.system, pageref: 'Page 1' },
        { id: 'note2', text: 'Note 2', open: false, containedBy: null, parent: actor.system, pageref: 'Page 2' },
        { id: 'note3', text: 'Note 3', open: true, containedBy: null, parent: actor.system, pageref: 'Page 3' },
        {
          id: 'note1.1',
          text: 'Note 1.1',
          open: true,
          containedBy: 'note1',
          parent: actor.system,
          pageref: 'Page 1',
        },
        {
          id: 'note1.1.1',
          text: 'Note 1.1.1',
          open: true,
          containedBy: 'note1.1',
          parent: actor.system,
          pageref: 'Page 1',
        },
        {
          id: 'note1.2',
          text: 'Note 1.2',
          open: true,
          containedBy: 'note1',
          parent: actor.system,
          pageref: 'Page 1',
        },
      ] as any

      actor.system.allNotes = allNotes
      // @ts-expect-error - mock for testing
      actor.system._source = { allNotes } as any
    })

    it('converts a request to remove the entire notes array with an empty array on allNotes', async () => {
      const updateData: Record<string, any> = { system: { '-=notes': null } }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData).length).toBe(1)
      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('allNotes')
      expect(updateData.system.allNotes).toStrictEqual([])
    })

    it('can insert new Notes', async () => {
      const updateData = {
        system: { notes: { '00004': { notes: 'Note 4', id: 'note4', open: true, containedBy: null } } },
      } as any

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('allNotes')
      expect(updateData.system.allNotes.length).toBe(7)

      expect(updateData.system.allNotes).toMatchObject([
        { id: 'note1', text: 'Note 1', open: true, containedBy: null },
        { id: 'note2', text: 'Note 2', open: false, containedBy: null },
        { id: 'note3', text: 'Note 3', open: true, containedBy: null },
        { id: 'note1.1', text: 'Note 1.1', open: true, containedBy: 'note1' },
        { id: 'note1.1.1', text: 'Note 1.1.1', open: true, containedBy: 'note1.1' },
        { id: 'note1.2', text: 'Note 1.2', open: true, containedBy: 'note1' },
        { id: 'note4', text: 'Note 4', open: true, containedBy: null },
      ])
    })

    it("updates the entire allNotes array if any element's data is updated", async () => {
      const updateData = { system: { notes: { '00001': { notes: 'Updated Note 2' } } } } as any

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('allNotes')
      expect(updateData.system.allNotes.length).toBe(6)

      expect(updateData.system.allNotes).toMatchObject([
        { id: 'note1', text: 'Note 1', open: true, containedBy: null },
        { id: 'note2', text: 'Updated Note 2', open: false, containedBy: null },
        { id: 'note3', text: 'Note 3', open: true, containedBy: null },
        { id: 'note1.1', text: 'Note 1.1', open: true, containedBy: 'note1' },
        { id: 'note1.1.1', text: 'Note 1.1.1', open: true, containedBy: 'note1.1' },
        { id: 'note1.2', text: 'Note 1.2', open: true, containedBy: 'note1' },
      ])
    })

    it('can update nested note data', async () => {
      const updateData = {
        system: { notes: { '00000': { contains: { '00000': { notes: 'Updated Note 1.1' } } } } },
      } as any

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})
      expect(Object.keys(updateData).length).toBe(1)
      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('allNotes')
      expect(updateData.system.allNotes).toMatchObject([
        { id: 'note1', text: 'Note 1', open: true, containedBy: null },
        { id: 'note2', text: 'Note 2', open: false, containedBy: null },
        { id: 'note3', text: 'Note 3', open: true, containedBy: null },
        { id: 'note1.1', text: 'Updated Note 1.1', open: true, containedBy: 'note1' },
        { id: 'note1.1.1', text: 'Note 1.1.1', open: true, containedBy: 'note1.1' },
        { id: 'note1.2', text: 'Note 1.2', open: true, containedBy: 'note1' },
      ])
    })

    it('can update deeply nested note data', async () => {
      const updateData = {
        system: {
          notes: {
            '00000': {
              contains: {
                '00000': {
                  contains: { '00000': { notes: 'Updated Note 1.1.1', pageref: 'Updated Page' } },
                },
              },
            },
          },
        },
      } as any

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData).length).toBe(1)
      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('allNotes')
      expect(updateData.system.allNotes).toMatchObject([
        { id: 'note1', text: 'Note 1', open: true, containedBy: null },
        { id: 'note2', text: 'Note 2', open: false, containedBy: null },
        { id: 'note3', text: 'Note 3', open: true, containedBy: null },
        { id: 'note1.1', text: 'Note 1.1', open: true, containedBy: 'note1' },
        {
          id: 'note1.1.1',
          text: 'Updated Note 1.1.1',
          open: true,
          containedBy: 'note1.1',
          reference: 'Updated Page',
        },
        { id: 'note1.2', text: 'Note 1.2', open: true, containedBy: 'note1' },
      ])
    })
  })

  describe('translate legacy HitLocation data', () => {
    let allHitLocations: any[]

    beforeEach(() => {
      allHitLocations = [
        {
          _damageType: null,
          _dr: 1,
          drCap: 0,
          drItem: 0,
          drMod: 0,
          equipment: '',
          import: 0,
          penalty: 0,
          rollText: '',
          where: 'Head',
          role: 'Head',
        },
        {
          _damageType: null,
          _dr: 2,
          drCap: 0,
          drItem: 0,
          drMod: 0,
          equipment: '',
          import: 0,
          penalty: 0,
          rollText: '',
          where: 'Torso',
          role: 'Torso',
        },
        {
          _damageType: null,
          _dr: 3,
          drCap: 0,
          drItem: 0,
          drMod: 0,
          equipment: '',
          import: 0,
          penalty: 0,
          rollText: '',
          where: 'Left Arm',
          role: 'Limb',
        },
        {
          _damageType: null,
          _dr: 3,
          drCap: 0,
          drItem: 0,
          drMod: 0,
          equipment: '',
          import: 0,
          penalty: 0,
          rollText: '',
          where: 'Right Arm',
          role: 'Limb',
        },
      ] as any

      actor.system.hitlocationsV2 = allHitLocations
      // @ts-expect-error - mock for testing
      actor.system._source = { hitlocationsV2: allHitLocations } as any
    })

    it('converts a request to remove the entire hitlocations array with an empty array on hitlocationsV2', async () => {
      const updateData: Record<string, any> = { system: { '-=hitlocations': null } }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('hitlocationsV2')
      expect(updateData.system['hitlocationsV2']).toStrictEqual([])
    })

    it('can update existing HitLocations', async () => {
      const updateData: Record<string, any> = {
        system: {
          hitlocations: {
            '00000': {
              where: 'Head',
              dr: 4,
              role: 'Some notes about the head.',
            },
            '00001': {
              where: 'Torso',
              dr: 3,
              role: 'Some notes about the torso.',
            },
          },
        },
      }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('hitlocationsV2')
      expect(updateData.system.hitlocationsV2).toEqual([
        {
          ...allHitLocations[0],
          where: 'Head',
          _dr: 4,
          role: 'Some notes about the head.',
        },
        {
          ...allHitLocations[1],
          where: 'Torso',
          _dr: 3,
          role: 'Some notes about the torso.',
        },
        {
          ...allHitLocations[2],
          where: 'Left Arm',
          _dr: 3,
          role: 'Limb',
        },
        {
          ...allHitLocations[3],
          where: 'Right Arm',
          _dr: 3,
          role: 'Limb',
        },
      ])
    })

    it('can insert new HitLocations', async () => {
      const updateData: Record<string, any> = {
        system: {
          hitlocations: {
            '00004': {
              where: 'Left Leg',
              dr: 2,
              role: 'Limb',
            },
            '00005': {
              where: 'Right Leg',
              dr: 2,
              role: 'Limb',
            },
          },
        },
      }

      // @ts-expect-error - testing protected method
      await actor._preUpdate(updateData, {}, {})

      expect(Object.keys(updateData.system).length).toBe(1)
      expect(Object.keys(updateData.system)).toContain('hitlocationsV2')
      expect(updateData.system.hitlocationsV2).toEqual([
        {
          ...allHitLocations[0],
          where: 'Head',
          _dr: 1,
          role: 'Head',
        },
        {
          ...allHitLocations[1],
          where: 'Torso',
          _dr: 2,
          role: 'Torso',
        },
        {
          ...allHitLocations[2],
          where: 'Left Arm',
          _dr: 3,
          role: 'Limb',
        },
        {
          ...allHitLocations[3],
          where: 'Right Arm',
          _dr: 3,
          role: 'Limb',
        },
        {
          where: 'Left Leg',
          _dr: 2,
          role: 'Limb',
        },
        {
          where: 'Right Leg',
          _dr: 2,
          role: 'Limb',
        },
      ])
    })
  })
})
