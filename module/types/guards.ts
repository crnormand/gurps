export const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null

export const isGameReady = (gameInstance: typeof game): gameInstance is ReadyGame =>
  isDefined(gameInstance) && gameInstance.ready === true
