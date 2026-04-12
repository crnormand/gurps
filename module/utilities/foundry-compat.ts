/**
 * Compatibility layer for Foundry VTT v13 and v14+ data update operations.
 *
 * In v14+, Foundry provides globalThis._replace(value) and globalThis._del for
 * replacing and deleting nested document data. In v13 and below, the convention
 * was to use '.-=key': null to delete and then set the new value.
 */

declare const _replace: (value: unknown) => unknown
declare const _del: unknown

interface Actor {
  internalUpdate(data: Record<string, unknown>, options?: Record<string, unknown>): Promise<void>
}

/**
 * Returns true if the current Foundry VTT version is at least the given major version.
 */
export function isAtLeastFoundryVersion(majorVersion: number): boolean {
  return (game.release?.generation ?? 0) >= majorVersion
}

/**
 * Build an update object that replaces a nested key's value.
 *
 * On v14+: { 'system.traits': _replace(value) }
 * On v13-: { 'system.-=traits': null, 'system.traits': value }
 */
export function replaceValue(key: string, value: unknown): Record<string, unknown> {
  if (isAtLeastFoundryVersion(14)) {
    return { [key]: _replace(value) }
  }

  const lastDot = key.lastIndexOf('.')
  const delKey = lastDot >= 0 ? `${key.substring(0, lastDot)}.-=${key.substring(lastDot + 1)}` : `-=${key}`

  return {
    [delKey]: null,
    [key]: value,
  }
}

/**
 * Build an update object that deletes a nested key.
 *
 * On v14+: { 'system.equipment.carried': _del }
 * On v13-: { 'system.equipment.-=carried': null }
 */
export function deleteKey(key: string): Record<string, unknown> {
  if (isAtLeastFoundryVersion(14)) {
    return { [key]: _del }
  }

  const lastDot = key.lastIndexOf('.')
  const delKey = lastDot >= 0 ? `${key.substring(0, lastDot)}.-=${key.substring(lastDot + 1)}` : `-=${key}`

  return { [delKey]: null }
}

/**
 * Apply a batched commit update to an actor, handling v13/v14 differences.
 *
 * On v14+, a single internalUpdate call suffices.
 * On v13-, deletes (.-= keys) must be applied first, then additions with { diff: false }.
 */
export async function commitUpdate(actor: Actor, commit: Record<string, unknown>): Promise<void> {
  if (isAtLeastFoundryVersion(14)) {
    await actor.internalUpdate(commit)
  } else {
    const deletes = Object.fromEntries(Object.entries(commit).filter(([key]) => key.includes('.-=')))
    const adds = Object.fromEntries(Object.entries(commit).filter(([key]) => !key.includes('.-=')))
    await actor.internalUpdate(deletes, { diff: true })
    await actor.internalUpdate(adds, { diff: false })
  }
}
