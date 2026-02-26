/**
 * This module contains type guards and assertion functions for various Foundry and GURPS-specific types.
 */

const isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null

/* ---------------------------------------- */

const isGameReady = (gameInstance: typeof game): gameInstance is ReadyGame =>
  isDefined(gameInstance) && gameInstance.ready === true

/* ---------------------------------------- */

const getGame = (): ReadyGame => {
  if (!game || !game.ready) {
    throw new Error('Game not ready')
  }

  return game
}

/* ---------------------------------------- */

const getUser = (): User => {
  const user = game?.user

  if (!user) {
    throw new Error('User not available')
  }

  return user
}

/* ---------------------------------------- */

const assertDefined = <T>(
  value: T | null | undefined,
  message = 'Expected value to be defined'
): asserts value is T => {
  if (value === null || value === undefined) {
    throw new TypeError(message)
  }
}

/* ---------------------------------------- */

const assertNever = (value: never, message?: string): never => {
  throw new Error(message ?? `Unexpected value: ${String(value)}`)
}

/* ---------------------------------------- */

const requireDataset = (element: HTMLElement, key: string): string => {
  const value = element.dataset[key]

  if (value === undefined) {
    throw new Error(`Missing required data-${key} attribute`)
  }

  return value
}

/* ---------------------------------------- */

const isHTMLElement = (value: unknown): value is HTMLElement => value instanceof HTMLElement

/* ---------------------------------------- */

const isHTMLInputElement = (value: unknown): value is HTMLInputElement => value instanceof HTMLInputElement

/* ---------------------------------------- */

export const isObject = (value: unknown): value is Record<string, unknown> =>
  isDefined(value) && typeof value === 'object'

/* ---------------------------------------- */

const isUpdatableDocument = (value: unknown): value is gurps.UpdatableDocument =>
  isObject(value) && 'update' in value && typeof value.update === 'function'

/* ---------------------------------------- */

/**
 * Used to check if a given value is a MetadataOwner, which is the case for Document system subclasses
 * and PseudoDocuments.
 */
const hasMetadata = (value: unknown): value is gurps.MetadataOwner =>
  (isObject(value) || typeof value === 'function') && 'metadata' in value && isObject(value.metadata)

/* ---------------------------------------- */

export {
  assertDefined,
  assertNever,
  getGame,
  getUser,
  hasMetadata,
  isDefined,
  isGameReady,
  isHTMLElement,
  isHTMLInputElement,
  isUpdatableDocument,
  requireDataset,
}
