import { GurpsActorV2 } from '../module/actor/gurps-actor.js'

describe('GurpsActorV2', () => {
  let actor: GurpsActorV2<'characterV2'>

  beforeEach(() => {
    // Ensure minimal globals exist
    // @ts-ignore
    global.GURPS = global.GURPS || { module: {} }
    // @ts-ignore
    global.game = global.game || {}

    // Instantiate with minimal data that our test base Actor supports
    // @ts-ignore
    actor = new GurpsActorV2({ name: 'Test Actor', type: 'characterV2' })
  })

  it('can be instantiated', () => {
    expect(actor).toBeInstanceOf(GurpsActorV2)
    expect(actor.name).toBe('Test Actor')
    expect(actor.type).toBe('characterV2')
  })

  describe('_preUpdate', () => {
    it('does not transform non-legacy data', async () => {
      const updateData = { name: 'Updated Actor' }

      // @ts-ignore
      await actor._preUpdate(updateData, {}, {})

      expect(updateData).toBe(updateData)
    })

    describe('translate legacy Move data', () => {
      it('converts a request to remove the entire move array with an empty array on MoveV2', async () => {
        const updateData: Record<string, any> = { 'system.-=move': null }

        // @ts-ignore
        await actor._preUpdate(updateData, {}, {})

        expect(Object.keys(updateData).length).toBe(1)
        expect(Object.keys(updateData)).toContain('system.moveV2')
        expect(updateData['system.moveV2']).toStrictEqual([])
      })

      it('transforms legacy move data to moveV2', async () => {
        const updateData: Record<string, any> = {
          'system.move': {
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
        }

        // @ts-ignore
        await actor._preUpdate(updateData, {}, {})

        expect(Object.keys(updateData).length).toBe(1)
        expect(Object.keys(updateData)).toContain('system.moveV2')
        expect(updateData['system.moveV2']).toEqual([
          { mode: 'Ground', basic: 3, enhanced: 4, default: true },
          { mode: 'Water', basic: 1, enhanced: 2, default: false },
          { mode: 'Air', basic: 5, enhanced: 6, default: false },
        ])
      })

      it("updates the entire move2 array if any element's data is updated", async () => {
        // Set initial moveV2 data.
        actor.system = { _source: { moveV2: [] } } as any
        actor.system._source.moveV2 = [
          { mode: 'Ground', basic: 6, enhanced: 12, default: true },
          { mode: 'Water', basic: 1, enhanced: null, default: false },
          { mode: 'Air', basic: 12, enhanced: 24, default: false },
        ]

        const updateData: Record<string, any> = { 'system.move.00001.basic': 10 }

        // @ts-ignore
        await actor._preUpdate(updateData, {}, {})

        expect(Object.keys(updateData).length).toBe(1)
        expect(Object.keys(updateData)).toContain('system.moveV2')
        expect(updateData['system.moveV2']).toEqual([
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

        const updateData: Record<string, any> = {
          'system.move.00001': {
            mode: 'Space',
            basic: 10,
            enhanced: 20,
            default: false,
          },
        }

        // @ts-ignore
        await actor._preUpdate(updateData, {}, {})

        expect(Object.keys(updateData).length).toBe(1)
        expect(Object.keys(updateData)).toContain('system.moveV2')
        expect(updateData['system.moveV2']).toEqual([
          { mode: 'Ground', basic: 6, enhanced: 12, default: true },
          { mode: 'Space', basic: 10, enhanced: 20, default: false },
          { mode: 'Air', basic: 12, enhanced: 24, default: false },
        ])
      })
    })

    // describe('translate legacy HitLocation data', () => {
    //   it.skip('convert a request to remove the whole array to ', async () => {
    //     const updateData: Record<string, any> = {}
    //   })
    // })
  })
})
