export function isConfigurationAllowed(actor) {
  return game.user.isGM || actor.isOwner
}

export function isCombatActive() {
  return game.combats && game.combats.active
}

export function isTokenInActiveCombat(token) {
  return game.combats.active?.combatants.some(c => c.token?.id === token.id)
}
