import { isDefined } from '../types/guards.ts'

export const getTokenForActor = (actor: Actor.Implementation | null | undefined): Token | undefined => {
  const firstActiveToken = actor?.getActiveTokens()?.[0]
  if (isDefined(firstActiveToken)) return firstActiveToken
  const canvasInstance = canvas
  if (!isDefined(canvasInstance)) throw new TypeError("Cannot read properties of undefined (reading 'tokens')")
  return canvasInstance.tokens?.controlled?.[0]
}
