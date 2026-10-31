import { isActorInCombat } from '@module/combat/utilities.js'

const globalAny = globalThis as any

/**
 * Stand up a combat holding combatants for the given actor ids.
 */
const encounterWith = (...actorIds: string[]) => {
  globalAny.game.combat = { combatants: actorIds.map(actorId => ({ actorId })) }
}

describe('isActorInCombat', () => {
  it('is true for an actor with a combatant in the encounter', () => {
    encounterWith('brent', 'dragon')

    expect(isActorInCombat('brent')).toBe(true)
  })

  it('is false for an actor with no combatant in the encounter', () => {
    encounterWith('dragon')

    expect(isActorInCombat('brent')).toBe(false)
  })

  test('no encounter is running', () => {
    globalAny.game.combat = undefined

    expect(isActorInCombat('brent')).toBe(false)
  })

  // game.combat throws rather than returning undefined while the game is still starting up.
  test('game.combat is not available yet', () => {
    Object.defineProperty(globalAny.game, 'combat', {
      configurable: true,
      get() {
        throw new Error('not ready')
      },
    })

    expect(isActorInCombat('brent')).toBe(false)
  })
})
