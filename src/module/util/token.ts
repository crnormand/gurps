export const getTokenForActor = (actor: any): Token.Implementation | undefined =>
  actor?.getActiveTokens?.()?.[0] ?? (globalThis as any).canvas?.tokens?.controlled?.[0]
