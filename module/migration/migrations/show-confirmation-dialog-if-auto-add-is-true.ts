import * as Settings from '../../../lib/miscellaneous-settings.js'
import { MigrationRunner } from '../runner.js'

export async function showConfirmationDialogIfAutoAddIsTrue(this: MigrationRunner): Promise<void> {
  if (this.migrationVersion.isHigherThan(this.currentVersion)) {
    const taggedModifiers = game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
    if (!taggedModifiers) {
      return
    }

    if (taggedModifiers.autoAdd) {
      game.settings?.set(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true)
    }
  }
}
