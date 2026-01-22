import { isDefined } from './utilities/guards.ts'

export const isConfigurationAllowed = (actor: Actor.Implementation): boolean => {
  const user = game.user

  if (!isDefined(user)) throw new TypeError("Cannot read properties of null (reading 'isGM')")

  return user.isGM || actor.isOwner
}

export const isCombatActive = (): Combat | undefined => {
  const combats = game.combats

  if (!isDefined(combats)) return undefined

  return combats.active
}

export const isTokenInActiveCombat = (token: Token): boolean | undefined => {
  const combats = game.combats

  if (!isDefined(combats)) throw new TypeError("Cannot read properties of undefined (reading 'active')")

  return combats.active?.combatants.some(combatant => combatant.token?.id === token.id)
}
