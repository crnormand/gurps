import { migrateLegacySettings, SettingMigration } from '@module/util/migration/settings-migration.js'

import { LEGACY_SHOW_DEBUG_INFO, SHOW_DEBUG_INFO } from './types.js'

const migration: SettingMigration = {
  oldName: LEGACY_SHOW_DEBUG_INFO,
  newName: SHOW_DEBUG_INFO,
  migrateValue: value => Boolean(value),
}

export async function migrate(): Promise<void> {
  return migrateLegacySettings(GURPS.SYSTEM_NAME, [migration])
}
