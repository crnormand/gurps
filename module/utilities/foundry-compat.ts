/**
 * Compatibility layer for Foundry VTT v13 and v14+ data update operations.
 *
 * In v14+, Foundry provides globalThis._replace(value) and globalThis._del for
 * replacing and deleting nested document data. In v13 and below, the convention
 * was to use '.-=key': null to delete and then set the new value.
 */

interface InternalUpdatable {
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
    return { [key]: (globalThis as any)._replace(value) }
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
    return { [key]: (globalThis as any)._del }
  }

  const lastDot = key.lastIndexOf('.')
  const delKey = lastDot >= 0 ? `${key.substring(0, lastDot)}.-=${key.substring(lastDot + 1)}` : `-=${key}`

  return { [delKey]: null }
}

/**
 * Apply a batched commit update to an actor, handling v13/v14 differences.
 *
 * On v14+, a single internalUpdate call suffices.
 * On v13-, delete entries (-= keys) must be applied first, then additions with { diff: false }.
 */
export async function commitUpdate(actor: InternalUpdatable, commit: Record<string, unknown>): Promise<void> {
  if (isAtLeastFoundryVersion(14)) {
    await actor.internalUpdate(commit)
  } else {
    const deletes = Object.fromEntries(Object.entries(commit).filter(([key]) => key.includes('-=')))
    const adds = Object.fromEntries(Object.entries(commit).filter(([key]) => !key.includes('-=')))
    await actor.internalUpdate(deletes, { diff: true })
    await actor.internalUpdate(adds, { diff: false })
  }
}

export class Foundry {
  static isAtLeastVersion = isAtLeastFoundryVersion
  static replaceValue = replaceValue
  static deleteKey = deleteKey
  static commitUpdate = commitUpdate

  static getMessageMode(): MessageMode {
    if (!game.settings) throw new Error('game.settings is not available')

    // In Foundry 14+, the message mode is stored in game.settings under 'core.messageMode'. In v13-, it's under 'core.rollMode'.
    const value = Foundry.isAtLeastVersion(14)
      ? // @ts-expect-error - messageMode is not typed in Foundry 14's settings yet
        (game.settings.get('core', 'messageMode') as string)
      : (game.settings.get('core', 'rollMode') as string)

    return new MessageMode(value)
  }

  static setMessageMode(mode: MessageMode): void {
    if (!game.settings) throw new Error('game.settings is not available')

    if (Foundry.isAtLeastVersion(14)) {
      // @ts-expect-error - treating messageMode as any to avoid TypeScript errors
      game.settings.set('core', 'messageMode', mode.value as any)
    } else {
      game.settings.set('core', 'rollMode', mode.value as any)
    }
  }

  static applyMessageMode(data: Record<string, unknown>, mode: MessageMode): Record<string, unknown> {
    if (Foundry.isAtLeastVersion(14)) {
      return { ...data, messageMode: mode.value }
    } else {
      return { ...data, rollMode: mode.value }
    }
  }
}

export class MessageMode {
  constructor(public value: string) {}

  isPublic(): boolean {
    return this.value === 'public' || this.value === 'publicroll'
  }

  isGM(): boolean {
    return this.value === 'gm' || this.value === 'gmroll'
  }

  isBlind(): boolean {
    return this.value === 'blind' || this.value === 'blindroll'
  }

  isSelf(): boolean {
    return this.value === 'self' || this.value === 'selfroll'
  }

  isIC(): boolean {
    return this.value === 'ic'
  }

  static get GM() {
    return Foundry.isAtLeastVersion(14) ? new MessageMode('gm') : new MessageMode('gmroll')
  }

  static get Blind() {
    return Foundry.isAtLeastVersion(14) ? new MessageMode('blind') : new MessageMode('blindroll')
  }

  static get Self() {
    return Foundry.isAtLeastVersion(14) ? new MessageMode('self') : new MessageMode('selfroll')
  }

  static get Public() {
    return Foundry.isAtLeastVersion(14) ? new MessageMode('public') : new MessageMode('publicroll')
  }

  static get IC() {
    return new MessageMode('ic')
  }
}
