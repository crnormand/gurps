export function isConfigurationAllowed(actor) {
  return game.user.isGM || actor.isOwner
}

export function isCombatActive() {
  return game.combats && game.combats.active
}

export function isTokenInActiveCombat(token) {
  return game.combats.active?.combatants.some(combatant => combatant.token?.id === token.id)
}
