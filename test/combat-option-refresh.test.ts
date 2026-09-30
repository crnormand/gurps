import { renderedActorSheets } from '../module/combat/settings.js'

/**
 * An actor whose `sheet` is a lazy getter that constructs on demand, the way Foundry's
 * `Document#sheet` does. `constructedSheet` records whether anything reached for that getter.
 */
const actorWithLazySheet = ({ open = false } = {}) => {
  const actor: any = { _sheet: open ? { rendered: true } : null, constructedSheet: false }
  Object.defineProperty(actor, 'sheet', {
    get() {
      this.constructedSheet = true
      if (!this._sheet) this._sheet = { rendered: false }
      return this._sheet
    },
  })
  return actor
}

const world = ({ actors = [] as any[], tokens = [] as any[] } = {}) => {
  ;(globalThis as any).game.actors = actors
  ;(globalThis as any).canvas = { tokens: { placeables: tokens } }
}

describe('renderedActorSheets', () => {
  it('returns the sheet of an actor whose sheet is open', () => {
    const actor = actorWithLazySheet({ open: true })
    world({ actors: [actor] })

    expect(renderedActorSheets()).toEqual([actor._sheet])
  })

  it('omits an actor whose sheet has never been opened', () => {
    world({ actors: [actorWithLazySheet({ open: false })] })

    expect(renderedActorSheets()).toEqual([])
  })

  it('never constructs a sheet for an actor that has not got one', () => {
    const actor = actorWithLazySheet({ open: false })
    world({ actors: [actor] })

    renderedActorSheets()

    expect(actor.constructedSheet).toBe(false)
  })

  it('returns the sheet of the synthetic actor behind an unlinked token', () => {
    const actor = actorWithLazySheet({ open: true })
    world({ actors: [], tokens: [{ actor }] })

    expect(renderedActorSheets()).toEqual([actor._sheet])
  })

  it('returns one sheet for an actor that is also on the canvas', () => {
    const actor = actorWithLazySheet({ open: true })
    world({ actors: [actor], tokens: [{ actor }] })

    expect(renderedActorSheets()).toHaveLength(1)
  })

  test('a token has no actor', () => {
    world({ actors: [], tokens: [{ actor: null }] })

    expect(renderedActorSheets()).toEqual([])
  })
})
