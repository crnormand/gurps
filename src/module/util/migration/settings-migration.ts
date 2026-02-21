/**
 * Configuration for migrating a legacy setting to a new setting.
 */
export interface SettingMigration {
  /** The old setting key (without namespace prefix). */
  oldName: string
  /** The new setting key (without namespace prefix). */
  newName: string
  /** Function to transform the old value to the new format. */
  migrateValue: (oldValue: unknown) => Promise<unknown> | unknown
}

/**
 * Migrates legacy settings to a new format. This is intended to be used when a setting's data structure has changed
 * significantly or when settings are being moved to new keys.
 *
 * The migration process involves the following steps:
 *
 * 1. Identify legacy settings based on a provided namespace prefix and an array of migration configurations.
 * 2. For each identified legacy setting, execute its migration function to transform the old value to the new format.
 * 3. Save the transformed value to the new setting key using game.settings.set().
 * 4. After all migrations are complete, delete the old settings (if the new setting key is different) to prevent the
 *    migration from running again in the future.
 *
 * NOTE: If the migrating a setting in-place (i.e. the new setting key is the same as the old setting key), the old
 * setting will not be deleted, but its value will be transformed. The migration function should detect already-
 * migrated values and return them unchanged to ensure idempotent migrations.
 *
 * @param namespacePrefix The namespace prefix for the settings to be migrated.
 * @param migrations An array of migration configurations specifying old/new setting names and value transformation.
 * @returns A promise that resolves when the migration is complete.
 */
export async function migrateLegacySettings(namespacePrefix: string, migrations: SettingMigration[]): Promise<void> {
  const storage = game.settings?.storage.get('world')

  if (!storage) {
    console.warn('GURPS | Settings migration skipped: world storage not available')

    return
  }

  const migrationActions: Promise<void>[] = []
  const deletionIds: string[] = []
  const migrationDetails: Array<{ oldKey: string; newName: string }> = []

  const prefixDot = namespacePrefix + '.'

  for (const entry of storage.contents.filter((entry: foundry.documents.Setting) => entry.key.startsWith(prefixDot))) {
    const legacyKey = entry.key.slice(prefixDot.length)

    const migration = migrations.find(migration => migration.oldName === legacyKey)

    if (!migration) continue

    // Transform the value and save to new setting.
    // Using Promise.resolve().then() to ensure synchronous errors are caught
    const migrationPromise = Promise.resolve()
      .then(() => migration.migrateValue(entry.value))
      .then(newValue => (game.settings as any)!.set(namespacePrefix, migration.newName, newValue))

    migrationActions.push(migrationPromise)
    migrationDetails.push({ oldKey: entry.key, newName: migration.newName })

    // Only delete the old setting if the new setting key is different. This allows for in-place value transformations
    // without key changes, while still ensuring that migrated settings are cleaned up.
    if (migration.newName !== migration.oldName) deletionIds.push(entry.id)
  }

  if (migrationActions.length === 0) return

  console.log(
    `GURPS | Starting migration of ${migrationActions.length} legacy setting(s) (namespace: ${namespacePrefix})`
  )

  // Wait for all migration actions to complete before deleting old settings.
  const results = await Promise.allSettled(migrationActions)

  // Check for failed migrations and remove them from deletion list.
  const failedIndices: number[] = []

  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      const settingId = deletionIds[index]
      const setting = storage.get(settingId)

      console.error(`GURPS | Migration failed for setting: ${setting?.key ?? settingId}`, result.reason)
      failedIndices.push(index)
    } else {
      const detail = migrationDetails[index]

      console.log(`GURPS | Migrated setting: ${detail.oldKey} → ${namespacePrefix}.${detail.newName}`)
    }
  }

  // Remove failed migrations from deletion list (so they can be retried on next launch)
  for (const index of failedIndices.reverse()) {
    deletionIds.splice(index, 1)
  }

  // Remove migrated legacy settings so the migration only runs once.
  for (const key of deletionIds) {
    const settingToDelete = storage.get(key)

    if (settingToDelete) {
      await settingToDelete.delete()
      console.debug(`GURPS | Deleted migrated legacy setting: ${settingToDelete.key}`)
    }
  }

  // Log summary
  const successCount = deletionIds.length
  const failedCount = failedIndices.length

  if (failedCount > 0)
    console.warn(`GURPS | Settings migration completed with ${failedCount} failure(s) and ${successCount} success(es)`)

  if (successCount > 0) console.log(`GURPS | Successfully migrated ${successCount} legacy setting(s)`)
}
