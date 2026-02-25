import { migrateSettings } from '@module/util/migrate-settings.js'

import {
  AUTOMATICALLY_SET_IGNORE_QTY,
  DISPLAY_PRESERVE_QTY_FLAG,
  IMPORT_EXTENDED_VALUES_GCS,
  IMPORT_FILE_ENCODING,
  ONLY_TRUSTED_IMPORT,
  OVERWRITE_BODYPLAN,
  OVERWRITE_HP_FP,
  OVERWRITE_NAME,
  OVERWRITE_PORTRAITS,
  SETTING_AUTOMATICALLY_SET_IGNOREQTY,
  SETTING_BLOCK_IMPORT,
  SETTING_IGNORE_IMPORT_NAME,
  SETTING_IMPORT_BODYPLAN,
  SETTING_IMPORT_EXTENDED_VALUES_GCS,
  SETTING_IMPORT_FILE_ENCODING,
  SETTING_IMPORT_HP_FP,
  SETTING_OVERWRITE_PORTRAITS,
  SETTING_USE_BROWSER_IMPORTER,
  SETTING_ignoreImportQty,
  USE_BROWSER_IMPORTER,
} from './types.js'

const OVERWRITE_CHOICE = {
  overwrite: 'overwrite',
  keep: 'keep',
  ask: 'ask',
} as const

type OverwriteChoice = (typeof OVERWRITE_CHOICE)[keyof typeof OVERWRITE_CHOICE]

function toOverwriteChoice(value: unknown): OverwriteChoice {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (numeric === 0) return OVERWRITE_CHOICE.overwrite
  if (numeric === 1) return OVERWRITE_CHOICE.keep

  return OVERWRITE_CHOICE.ask
}

function toEncoding(value: unknown): 'Latin1' | 'UTF8' {
  const numeric = typeof value === 'number' ? value : Number(value)

  return numeric === 0 ? 'Latin1' : 'UTF8'
}

type MigrationHandler = (value: unknown) => Promise<unknown>

const legacyMigrations = new Map<string, MigrationHandler>([
  [SETTING_IMPORT_HP_FP, value => game.settings!.set(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP, toOverwriteChoice(value))],
  [
    SETTING_IMPORT_BODYPLAN,
    value => game.settings!.set(GURPS.SYSTEM_NAME, OVERWRITE_BODYPLAN, toOverwriteChoice(value)),
  ],
  [SETTING_IGNORE_IMPORT_NAME, value => game.settings!.set(GURPS.SYSTEM_NAME, OVERWRITE_NAME, Boolean(!value))],
  [SETTING_BLOCK_IMPORT, value => game.settings!.set(GURPS.SYSTEM_NAME, ONLY_TRUSTED_IMPORT, Boolean(value))],
  [
    SETTING_AUTOMATICALLY_SET_IGNOREQTY,
    value => game.settings!.set(GURPS.SYSTEM_NAME, AUTOMATICALLY_SET_IGNORE_QTY, Boolean(value)),
  ],
  [
    SETTING_IMPORT_EXTENDED_VALUES_GCS,
    value => game.settings!.set(GURPS.SYSTEM_NAME, IMPORT_EXTENDED_VALUES_GCS, Boolean(value)),
  ],
  [
    SETTING_IMPORT_FILE_ENCODING,
    value => game.settings!.set(GURPS.SYSTEM_NAME, IMPORT_FILE_ENCODING, toEncoding(value)),
  ],
  [SETTING_USE_BROWSER_IMPORTER, value => game.settings!.set(GURPS.SYSTEM_NAME, USE_BROWSER_IMPORTER, Boolean(value))],
  [SETTING_ignoreImportQty, value => game.settings!.set(GURPS.SYSTEM_NAME, DISPLAY_PRESERVE_QTY_FLAG, Boolean(value))],
  [SETTING_OVERWRITE_PORTRAITS, value => game.settings!.set(GURPS.SYSTEM_NAME, OVERWRITE_PORTRAITS, Boolean(value))],
])

/**
 * Migrate legacy GCS Importer settings to new settings, and remove the legacy settings.
 */
export async function migrate(): Promise<void> {
  return migrateSettings(legacyMigrations)
}
