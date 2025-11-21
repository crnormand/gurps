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

      /* Test: input:
        {
          "save":false,
          "addToQuickRoll":false,
          "collapsed":{},
          "contains":{},
          "cr":15,
          "disabled":false,
          "fromItem":null,
          "hasContains":false,
          "hasCollapsed":false,
          "itemModifiers":"",
          "itemid":"Qfp10Etwg9779H9l",
          "level":0,
          "modifierTags":"",
          "name":"Always says \"Hail, and Well Met!\"",
          "notes":"",
          "originalName":"Always says \"Hail, and Well Met!\"",
          "pageref":"DFA68",
          "parentuuid":null,
          "points":-1,
          "uuid":"Actor.f9wRCqt63iE2YyTI.Item.Qfp10Etwg9779H9l"
        }
        
      Output:
        {
          "_id": "Qfp10Etwg9779H9l",
          "type": "featureV2",
          "name": "Always says \"Hail, and Well Met!\"",
          "sort": 0,
          "system": {
            "actions": {},
            "isContainer": false,
            "itemModifiers": "",
            "open": true,
            "reactions": [],
            "conditionalmods": [],
            "disabled": null,
            "containedBy": null,
            "fea": {
              "name": "Always says \"Hail, and Well Met!\"",
              "notes": "",
              "pageref": "DFA68",
              "vtt_notes": "",
              "cr": null,
              "level": 0,
              "userdesc": "",
              "points": -1
            }
          }
        }
      */
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

    // describe('translate legacy HitLocation data', () => {
    //   it.skip('convert a request to remove the whole array to ', async () => {
    //     const updateData: Record<string, any> = {}
    //   })
    // })
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
