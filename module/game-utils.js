export function isConfigurationAllowed(actor) {
  return game.user.isGM || actor.isOwner
}
