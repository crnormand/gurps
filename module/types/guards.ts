export const isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null

export const isGameReady = (gameInstance: typeof game): gameInstance is ReadyGame =>
  isDefined(gameInstance) && gameInstance.ready === true

export const getGame = (): ReadyGame => {
  if (!game || !game.ready) {
    throw new Error('Game not ready')
  }

  return game
}

export const getUser = (): User => {
  const user = game?.user

  if (!user) {
    throw new Error('User not available')
  }

  return user
}

export const assertDefined = <T>(
  value: T | null | undefined,
  message = 'Expected value to be defined'
): asserts value is T => {
  if (value === null || value === undefined) {
    throw new TypeError(message)
  }
}

export const assertNever = (value: never, message?: string): never => {
  throw new Error(message ?? `Unexpected value: ${String(value)}`)
}

export const requireDataset = (element: HTMLElement, key: string): string => {
  const value = element.dataset[key]

  if (value === undefined) {
    throw new Error(`Missing required data-${key} attribute`)
  }

  return value
}

export const isHTMLElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement

export const isHTMLInputElement = (value: unknown): value is HTMLInputElement => value instanceof HTMLInputElement

export const isObject = (value: unknown): value is Record<string, unknown> =>
  isDefined(value) && typeof value === 'object'
