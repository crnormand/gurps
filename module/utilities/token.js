export const getTokenForActor = actor =>
  actor?.getActiveTokens()?.[0] ?? canvas.tokens?.controlled?.[0]
