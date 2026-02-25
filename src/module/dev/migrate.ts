import { migrateSettings, SettingMigrationHandler } from '@module/util/migrate-settings.js'

import { LEGACY_SHOW_DEBUG_INFO, SHOW_DEBUG_INFO } from './types.ts'

const migrationHandlers = new Map<string, SettingMigrationHandler>([
  [LEGACY_SHOW_DEBUG_INFO, value => game.settings!.set(GURPS.SYSTEM_NAME, SHOW_DEBUG_INFO, Boolean(value))],
])

export async function migrate(): Promise<void> {
  return migrateSettings(migrationHandlers)
}
