function calculateRoFModifier(rof: number): number {
  if (rof < 17) return Math.ceil(rof / 4) - 1
  if (rof < 25) return 4
  if (rof < 50) return 5
  if (rof < 100) return 6

  return Math.floor(rof / 100) + 6
}

/**
 * Whether the actor has a combatant in the encounter currently being tracked.
 *
 * `game.combat` throws rather than returning undefined while the game is still starting up, hence
 * the try/catch: an actor prepared that early is in no encounter.
 */
function isActorInCombat(actorId: string): boolean {
  try {
    return !!game.combat?.combatants.some(c => c.actorId === actorId)
  } catch (err) {
    return false
  }
}

export { calculateRoFModifier, isActorInCombat }
