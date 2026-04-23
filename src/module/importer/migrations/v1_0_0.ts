import { migrateLegacySettings, SettingMigration } from '@module/migration/settings-migration.js'
import { MigrationReport } from '@module/migration/types.js'

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
} from '../types.js'

/* ---------------------------------------- */

const MIGRATION_VERSION = '1.0.0-alpha'

/* ---------------------------------------- */

const OVERWRITE_CHOICE = {
  overwrite: 'overwrite',
  keep: 'keep',
  ask: 'ask',
} as const

type OverwriteChoice = (typeof OVERWRITE_CHOICE)[keyof typeof OVERWRITE_CHOICE]

/* ---------------------------------------- */

function toOverwriteChoice(value: unknown): OverwriteChoice {
  const numeric = typeof value === 'number' ? value : Number(value)

  if (numeric === 0) return OVERWRITE_CHOICE.overwrite
  if (numeric === 1) return OVERWRITE_CHOICE.keep

  return OVERWRITE_CHOICE.ask
}

/* ---------------------------------------- */

function toEncoding(value: unknown): 'Latin1' | 'UTF8' {
  const numeric = typeof value === 'number' ? value : Number(value)

  return numeric === 0 ? 'Latin1' : 'UTF8'
}

/* ---------------------------------------- */

const migrations: SettingMigration[] = [
  {
    oldName: SETTING_IMPORT_HP_FP,
    newName: OVERWRITE_HP_FP,
    migrateValue: value => toOverwriteChoice(value),
  },
  {
    oldName: SETTING_IMPORT_BODYPLAN,
    newName: OVERWRITE_BODYPLAN,
    migrateValue: value => toOverwriteChoice(value),
  },
  {
    oldName: SETTING_IGNORE_IMPORT_NAME,
    newName: OVERWRITE_NAME,
    migrateValue: value => Boolean(!value),
  },
  {
    oldName: SETTING_BLOCK_IMPORT,
    newName: ONLY_TRUSTED_IMPORT,
    migrateValue: value => Boolean(value),
  },
  {
    oldName: SETTING_AUTOMATICALLY_SET_IGNOREQTY,
    newName: AUTOMATICALLY_SET_IGNORE_QTY,
    migrateValue: value => Boolean(value),
  },
  {
    oldName: SETTING_IMPORT_EXTENDED_VALUES_GCS,
    newName: IMPORT_EXTENDED_VALUES_GCS,
    migrateValue: value => Boolean(value),
  },
  {
    oldName: SETTING_IMPORT_FILE_ENCODING,
    newName: IMPORT_FILE_ENCODING,
    migrateValue: value => toEncoding(value),
  },
  {
    oldName: SETTING_USE_BROWSER_IMPORTER,
    newName: USE_BROWSER_IMPORTER,
    migrateValue: value => Boolean(value),
  },
  {
    oldName: SETTING_ignoreImportQty,
    newName: DISPLAY_PRESERVE_QTY_FLAG,
    migrateValue: value => Boolean(value),
  },
  {
    oldName: SETTING_OVERWRITE_PORTRAITS,
    newName: OVERWRITE_PORTRAITS,
    migrateValue: value => Boolean(value),
  },
]

/* ---------------------------------------- */

/**
 * Migrate legacy GCS Importer settings to new settings, and remove the legacy settings.
 */
export async function migrate(): Promise<MigrationReport | void> {
  await migrateLegacySettings(GURPS.SYSTEM_NAME, migrations).catch(error => {
    console.error('GURPS | Settings migration failed', error)
  })
}

export const v1_0_0 = { version: MIGRATION_VERSION, migrate }
