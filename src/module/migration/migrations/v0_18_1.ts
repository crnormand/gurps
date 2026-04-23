import { getGame } from '@module/util/guards.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

const MIGRATION_VERSION = '0.18.1'

/* ---------------------------------------- */

async function showConfirmationDialogIfAutoAddIsTrue() {
  const taggedModifiers = getGame().settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)

  if (taggedModifiers.autoAdd) {
    getGame().settings.set(GURPS.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true)
  }
}

/* ---------------------------------------- */

async function migrate(): Promise<void> {
  await showConfirmationDialogIfAutoAddIsTrue()
}

/* ---------------------------------------- */

export const v0_18_1 = { version: MIGRATION_VERSION, migrate }
