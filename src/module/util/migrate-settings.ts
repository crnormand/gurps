export type SettingMigrationHandler = (value: unknown) => Promise<unknown>

/**
 * Migrate legacy settings to the new format. This should be called during module initialization before any settings are
 * registered.
 */
export async function migrateSettings(migrationHandlers: Map<string, SettingMigrationHandler>): Promise<void> {
  const storage = game.settings?.storage.get('world') as foundry.documents.collections.WorldSettings

  if (!storage) return

  const namespacePrefix = `${GURPS.SYSTEM_NAME}.`
  const migrations: Promise<void>[] = []
  const deletions: string[] = []

  for (const entry of storage.contents) {
    if (!entry.key.startsWith(namespacePrefix)) continue

    const legacyKey = entry.key.slice(namespacePrefix.length)
    const handler = migrationHandlers.get(legacyKey)

    if (!handler) continue

    migrations.push(handler(entry.value).then(() => undefined))
    deletions.push(entry.id)
  }

  if (migrations.length === 0) return

  await Promise.all(migrations)

  for (const key of deletions) {
    // Remove migrated legacy settings so the migration only runs once.
    const settingToDelete = storage.get(key)

    if (settingToDelete) {
      await settingToDelete.delete()
      console.debug(`GURPS | Deleting migrated legacy setting: ${key}`)
    }
  }
}
