import { jest } from '@jest/globals'
import { GurpsActorV2 } from '../module/actor/gurps-actor.js'
import { parseItemKey } from '../module/utilities/object-utils.js'
import { CharacterModel } from '../module/actor/data/character.js'
import { GurpsItemV2 } from '../module/item/gurps-item.js'
import { TraitModel } from '../module/item/data/trait.js'
import { _Collection } from './foundry-utils/collection.js'

describe('GurpsActorV2', () => {
  let actor: GurpsActorV2<'characterV2'>

  beforeEach(() => {
    // Ensure minimal globals exist
    global.GURPS = global.GURPS || { module: {} }
    // @ts-expect-error
    global.game = global.game || {}

    // Instantiate with minimal data that our test base Actor supports
    actor = new GurpsActorV2({ name: 'Test Actor', type: 'characterV2' })
    actor.system = new CharacterModel()
    // @ts-expect-error
    actor.system._source = { allNotes: [], moveV2: [] }
  })

  it('can be instantiated', () => {
    expect(actor).toBeInstanceOf(GurpsActorV2)
    expect(actor.name).toBe('Test Actor')
    expect(actor.type).toBe('characterV2')
  })

  describe('_preUpdate', () => {
    it('does not transform non-legacy data', async () => {
      const updateData = { name: 'Updated Actor' }

      // @ts-expect-error
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
            // @ts-expect-error
            system: new TraitModel({
              containedBy: null,
            }),
          }),
          new GurpsItemV2({
            _id: 'ad2',
            name: 'Ad 2',
            type: 'featureV2',
            // @ts-expect-error
            system: new TraitModel({
              containedBy: null,
            }),
          }),
          new GurpsItemV2({
            _id: 'ad3',
            name: 'Ad 3',
            type: 'featureV2',
            // @ts-expect-error
            system: new TraitModel({
              containedBy: null,
            }),
          }),
          new GurpsItemV2({
            _id: 'ad2.1',
            name: 'Ad 2.1',
            type: 'featureV2',
            // @ts-expect-error
            system: new TraitModel({
              containedBy: 'ad2',
            }),
          }),
          new GurpsItemV2({
            _id: 'ad2.2',
            name: 'Ad 2.2',
            type: 'featureV2',
            // @ts-expect-error
            system: new TraitModel({
              containedBy: 'ad2',
            }),
          }),
          new GurpsItemV2({
            _id: 'ad2.2.1',
            name: 'Ad 2.2.1',
            type: 'featureV2',
            // @ts-expect-error
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
        // @ts-ignore
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
              // '00005': {
              //   uuid: 'ad5',
              //   name: 'Ad-Five 5',
              //   cr: 12,
              //   level: '5',
              //   points: 5,
              //   containedBy: null,
              //   notes: '[CR: 12 (Resist Quite Often): Ad-Five]<br/>Some note.',
              //   pageref: 'DFA77',
              // },
            },
          },
        }
        // @ts-ignore
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
          // {
          //   _id: 'ad5',
          //   type: 'featureV2',
          //   name: 'Ad-Five',
          //   sort: 1,
          //   system: {
          //     actions: {},
          //     isContainer: false,
          //     itemModifiers: '',
          //     open: true,
          //     reactions: [],
          //     conditionalmods: [],
          //     disabled: null,
          //     containedBy: null,
          //     fea: {
          //       name: 'Ad-Five',
          //       notes: 'Some note.',
          //       pageref: 'DFA77',
          //       vtt_notes: '',
          //       cr: 12,
          //       level: 5,
          //       userdesc: '',
          //       points: 5,
          //     },
          //   },
          // },
        ])
        expect(Object.keys(updateData.system).includes('ads')).toBe(false)
      })
    })

    describe('translate legacy Move data', () => {
      it('converts a request to remove the entire move array with an empty array on MoveV2', async () => {
        const updateData: Record<string, any> = { system: { '-=move': null } }

        // @ts-expect-error
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

        // @ts-expect-error
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

        // @ts-ignore
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

        // @ts-ignore
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
        // @ts-expect-error
        actor.system._source = { allNotes } as any
      })

      it('converts a request to remove the entire notes array with an empty array on allNotes', async () => {
        const updateData: Record<string, any> = { system: { '-=notes': null } }

        // @ts-ignore
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

        // @ts-ignore
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

        // @ts-ignore
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

        // @ts-ignore
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

        // @ts-ignore
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
  })

  describe('moveItem', () => {
    let equipmentItems: GurpsItemV2<'equipmentV2'>[]
    let EquipmentModel: any
    let equipmentData: any

    beforeEach(async () => {
      // Import EquipmentModel
      EquipmentModel = (await import('../module/item/data/equipment.js')).EquipmentModel

      // Mock game.settings for updateEqtCountV2
      // @ts-expect-error
      if (!global.game.settings) {
        // @ts-expect-error
        global.game.settings = {
          get: jest.fn().mockReturnValue(false), // Default to false for settings
        }
      }

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
        item.toObject = (source = true) => {
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
      const movedItem = updates.find((u: any) => u._id === 'eq1')
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
