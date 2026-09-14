import { CharacterModel } from '@module/actor/data/character.js'
import { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import { GurpsBaseActorSheet } from '@module/actor/sheets/base-actor-sheet.js'
import { GurpsActorGcsSheet } from '@module/actor/sheets/gcs-actor-sheet.js'
import { GurpsActorModernSheet } from '@module/actor/sheets/modern/sheet.js'
import { ActorType } from '@module/actor/types.js'

describe('Actor Sheets Active Effects CRUD', () => {
  let actor: GurpsActorV2<ActorType.Character>

  beforeEach(() => {
    // @ts-expect-error - mock game environment
    global.game = global.game || {}
    // @ts-expect-error - mock localize
    global.game.i18n = {
      localize: vi.fn((key: string) => key),
      format: vi.fn((key: string, data: any) => `${key}:${JSON.stringify(data)}`),
    }
    // @ts-expect-error - mock settings
    global.game.settings = {
      get: vi.fn().mockReturnValue(false),
    }

    global.GURPS = global.GURPS || {}
    // @ts-expect-error - mock StatusEffect
    global.GURPS.StatusEffect = {
      getAllPostures: vi.fn().mockReturnValue({}),
    }

    actor = new GurpsActorV2({ name: 'Test Character', type: ActorType.Character })
    actor.system = new CharacterModel()
    // @ts-expect-error - mock allNotes, allAdsV2, allSkillsV2, allSpellsV2, allEquipmentV2, meleeV2, rangedV2, reactions, conditionalmods
    actor.system.allNotes = []
    actor.system.allAdsV2 = []
    actor.system.allSkillsV2 = []
    actor.system.allSpellsV2 = []
    actor.system.allEquipmentV2 = []
    actor.system.meleeV2 = []
    actor.system.rangedV2 = []
    actor.system.reactions = []
    actor.system.conditionalmods = []
    // @ts-expect-error - mock additionalresources
    actor.system.additionalresources = { tracker: [], qnotes: '', currentEncumbrance: 0 }
    // @ts-expect-error - mock profile
    actor.system.profile = { createdon: '2026-01-01', modifiedon: '2026-01-01' }
    // @ts-expect-error - mock basicmove and pools
    actor.system.basicmove = { value: 5 }
    // @ts-expect-error - mock HP and FP
    actor.system.HP = { value: 10, max: 10 }
    // @ts-expect-error - mock HP and FP
    actor.system.FP = { value: 10, max: 10 }
    // @ts-expect-error - mock schema
    actor.system.schema = {
      fields: {
        attributes: { fields: {} },
        totalpoints: { fields: {} },
        profile: { fields: {} },
        conditions: { fields: { maneuver: { label: '' }, posture: { label: '' } } },
        HP: { fields: { damage: {}, value: {} } },
        FP: { fields: { damage: {}, value: {} } },
      },
    }
    // @ts-expect-error - source setup for mock
    actor.system._source = {
      allNotes: [],
      moveV2: [],
      profile: {},
      totalpoints: {},
      attributes: {},
      conditions: { posture: 'standing', maneuver: 'do_nothing', move: 5, actions: { maxActions: 1, maxBlocks: 1 } },
      additionalresources: { qnotes: '', currentEncumbrance: 0 },
      eqtsummary: { eqtcost: 0, eqtlbs: 0, othercost: 0, otherlbs: 0 },
      hitlocationsV2: [],
      HP: { value: 10, max: 10, damage: 0 },
      FP: { value: 10, max: 10, damage: 0 },
    }
    // @ts-expect-error - pseudoCollections setup for mock
    actor.pseudoCollections = { MoveMode: null }

    actor.getEmbeddedCollection = vi.fn().mockReturnValue({ contents: [] })
    actor.getItemAttacks = vi.fn().mockReturnValue([])
  })

  describe('GcsActorSheet effect context preparation', () => {
    it('filters out posture and maneuver effects from the sheet context', async () => {
      const regularEffect = {
        id: 'effect-1',
        name: 'Blessing',
        disabled: false,
        statuses: new Set(['blessed']),
        flags: {},
      }
      const postureEffect = {
        id: 'effect-2',
        name: 'Prone',
        disabled: false,
        statuses: new Set(['prone']),
        flags: { gurps: { effect: { type: 'posture' } } },
      }
      const maneuverEffect = {
        id: 'effect-3',
        name: 'Aim',
        disabled: false,
        statuses: new Set(['maneuver']),
        flags: { gurps: { statusId: 'maneuver' } },
      }

      actor.effects = {
        // @ts-expect-error - mock actor effects
        contents: [regularEffect, postureEffect, maneuverEffect],
        // @ts-expect-error - mock get method for actor effects
        get: vi.fn((id: string) => [regularEffect, postureEffect, maneuverEffect].find(effect => effect.id === id)),
      }

      const sheet = new GurpsActorGcsSheet({ document: actor })

      // @ts-expect-error - mock helper method for isolated context test
      sheet._prepareAttributes = vi.fn().mockReturnValue({})
      // @ts-expect-error - mock helper method for isolated context test
      sheet._prepareLiftingMoving = vi.fn().mockReturnValue([])
      // @ts-expect-error - accessing protected method for testing
      const context = await sheet._prepareContext({})

      expect(context.effects).toBeDefined()
      expect(context.effects).toHaveLength(1)
      expect(context.effects[0].name).toBe('Blessing')
    })
  })

  describe('GurpsActorModernSheet effect context preparation', () => {
    it('provides filtered effects to render context', async () => {
      const regularEffect = {
        id: 'effect-1',
        name: 'Shock -2',
        disabled: false,
        statuses: new Set(['shock2']),
        flags: {},
      }
      const postureEffect = {
        id: 'effect-2',
        name: 'Kneel',
        disabled: false,
        statuses: new Set(['kneel']),
        flags: { gurps: { effect: { type: 'posture' } } },
      }

      actor.effects = {
        // @ts-expect-error - mock actor effects
        contents: [regularEffect, postureEffect],
        // @ts-expect-error - mock get method for actor effects
        get: vi.fn((id: string) => [regularEffect, postureEffect].find(effect => effect.id === id)),
      }

      const sheet = new GurpsActorModernSheet({ document: actor })
      // @ts-expect-error - accessing protected method for testing
      const context = await sheet._prepareContext({})

      expect(context.effects).toBeDefined()
      expect(context.effects).toHaveLength(1)
      expect(context.effects[0].name).toBe('Shock -2')
    })
  })

  describe('ActiveEffect document retrieval with _getEmbedded', () => {
    it('resolves document from data-effect-id when data-uuid is missing', async () => {
      const effect = {
        id: 'effect-abc',
        name: 'Haste',
        sheet: { render: vi.fn() },
      }

      actor.effects = {
        // @ts-expect-error - mock get method for actor effects
        get: vi.fn((id: string) => (id === 'effect-abc' ? effect : null)),
      }

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const el = {
        closest: vi.fn((selector: string) => {
          if (selector.includes('data-effect-id')) return { dataset: { effectId: 'effect-abc' } }

          return null
        }),
      } as unknown as HTMLElement

      // @ts-expect-error - accessing protected method for testing
      const result = await sheet._getEmbedded(el)

      expect(result).toBe(effect)
      expect(actor.effects.get).toHaveBeenCalledWith('effect-abc')
    })
  })

  describe('ActiveEffect actions execution', () => {
    it('creates a new ActiveEffect when #onCreateEffect is invoked', async () => {
      const mockRender = vi.fn()
      const mockCreatedEffect = {
        id: 'new-effect-1',
        name: 'GURPS.effectNew',
        sheet: { render: mockRender },
      }

      actor.createEmbeddedDocuments = vi.fn().mockResolvedValue([mockCreatedEffect])

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const event = { preventDefault: vi.fn() } as unknown as PointerEvent

      // @ts-expect-error - invoking action handler
      await sheet.options.actions.createEffect.call(sheet, event, {} as HTMLElement)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [
        {
          name: 'GURPS.effectNew',
          img: 'icons/svg/aura.svg',
          disabled: false,
        },
      ])
      expect(mockRender).toHaveBeenCalledWith({ force: true })
    })

    it('creates an ActiveEffect via #onCreateEmbedded when documentName is ActiveEffect', async () => {
      const mockRender = vi.fn()
      const mockCreatedEffect = {
        id: 'new-effect-2',
        name: 'GURPS.effectNew',
        sheet: { render: mockRender },
      }

      actor.createEmbeddedDocuments = vi.fn().mockResolvedValue([mockCreatedEffect])

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const target = {
        closest: vi.fn((selector: string) => {
          if (selector.includes('data-document-name')) return { dataset: { documentName: 'ActiveEffect' } }

          return null
        }),
      } as unknown as HTMLElement

      const event = { preventDefault: vi.fn() } as unknown as PointerEvent

      // @ts-expect-error - invoking action handler
      await sheet.options.actions.createEmbedded.call(sheet, event, target)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(actor.createEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        [expect.objectContaining({ name: 'GURPS.effectNew', img: 'icons/svg/aura.svg', disabled: false })],
        { parent: actor }
      )
      expect(mockRender).toHaveBeenCalledWith({ force: true })
    })

    it('opens ActiveEffect sheet when #onEditEffect is invoked', async () => {
      const mockRender = vi.fn()
      const effect = {
        id: 'effect-edit-1',
        name: 'Blessing',
        uuid: 'Actor.123.ActiveEffect.effect-edit-1',
        sheet: { render: mockRender },
      }

      actor.effects = {
        // @ts-expect-error - mock get method for actor effects
        get: vi.fn((id: string) => (id === 'effect-edit-1' ? effect : null)),
      }

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const target = {
        closest: vi.fn((selector: string) => {
          if (selector.includes('data-effect-id')) return { dataset: { effectId: 'effect-edit-1' } }

          return null
        }),
      } as unknown as HTMLElement

      const event = { preventDefault: vi.fn() } as unknown as PointerEvent

      // @ts-expect-error - invoking action handler
      await sheet.options.actions.editEffect.call(sheet, event, target)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockRender).toHaveBeenCalledWith({ force: true })
    })

    it('toggles ActiveEffect disabled property when #onToggleEffect is invoked', async () => {
      const mockUpdate = vi.fn()
      const effect = Object.assign(Object.create(ActiveEffect.prototype), {
        id: 'effect-toggle-1',
        name: 'Blessing',
        disabled: false,
        update: mockUpdate,
      })

      // @ts-expect-error - mock actor effects
      actor.effects = {
        get: vi.fn((id: string) => (id === 'effect-toggle-1' ? effect : null)),
      }

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const target = {
        closest: vi.fn((selector: string) => {
          if (selector.includes('data-effect-id')) return { dataset: { effectId: 'effect-toggle-1' } }

          return null
        }),
      } as unknown as HTMLElement

      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as PointerEvent

      // @ts-expect-error - invoking action handler
      await sheet.options.actions.toggleEffect.call(sheet, event, target)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockUpdate).toHaveBeenCalledWith({ disabled: true })
    })

    it('deletes ActiveEffect via deleteDialog when available', async () => {
      const mockDeleteDialog = vi.fn()
      const effect = {
        id: 'effect-delete-1',
        name: 'Blessing',
        deleteDialog: mockDeleteDialog,
      }

      actor.effects = {
        // @ts-expect-error - mock get method for actor effects
        get: vi.fn((id: string) => (id === 'effect-delete-1' ? effect : null)),
      }

      const sheet = new GurpsBaseActorSheet({ document: actor })
      const target = {
        closest: vi.fn((selector: string) => {
          if (selector.includes('data-effect-id')) return { dataset: { effectId: 'effect-delete-1' } }

          return null
        }),
      } as unknown as HTMLElement

      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as PointerEvent

      // @ts-expect-error - invoking action handler
      await sheet.options.actions.deleteEffect.call(sheet, event, target)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(mockDeleteDialog).toHaveBeenCalled()
    })
  })
})
