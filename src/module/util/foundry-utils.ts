import { getGame } from './guards.js'

/**
 * MessageMode is a utility class that encapsulates the different message modes available in Foundry VTT. It provides
 * methods to check the current message mode and to create instances for each mode.
 */
export class MessageMode {
  static get GMOnly(): MessageMode {
    return new MessageMode('gm')
  }

  static get Public(): MessageMode {
    return new MessageMode('public')
  }

  static get Self(): MessageMode {
    return new MessageMode('self')
  }

  static get Blind(): MessageMode {
    return new MessageMode('blind')
  }

  static get InCharacter(): MessageMode {
    return new MessageMode('ic')
  }

  constructor(public readonly value: 'gm' | 'public' | 'self' | 'blind' | 'ic') {}

  get isSelf(): boolean {
    return this.value === 'self'
  }

  get isPublic(): boolean {
    return this.value === 'public'
  }

  get isBlind(): boolean {
    return this.value === 'blind'
  }

  get isGMOnly(): boolean {
    return this.value === 'gm'
  }

  get isInCharacter(): boolean {
    return this.value === 'ic'
  }
}

export class FoundryUtils {
  /**
   * Checks if the current Foundry VTT version is at least the specified major version.
   * @param majorVersion
   * @returns True if the current Foundry VTT version is at least the specified major version, false otherwise.
   */
  static isAtLeastVersion(majorVersion: number): boolean {
    return (getGame().release?.generation ?? 0) >= majorVersion
  }

  /**
   * Gets the current message mode from the game settings.
   * @returns The current message mode.
   */
  static get MessageMode(): MessageMode {
    const mode = getGame().settings.get('core', 'messageMode') ?? 'public'

    return new MessageMode(mode)
  }

  /**
   * Sets the current message mode in the game settings.
   * @param mode The message mode to set.
   * @returns void
   * @throws Error if the game is not ready or if the user is not available.
   * @remarks This method will throw an error if called before the game is ready or if the user is not available. It is recommended to call this method after the 'ready' hook has been fired.
   * @example
   * // Set message mode to GM only
   * FoundryUtils.MessageMode = MessageMode.GMOnly
   */
  static set MessageMode(mode: MessageMode) {
    getGame().settings.set('core', 'messageMode', mode.value)
  }
}
