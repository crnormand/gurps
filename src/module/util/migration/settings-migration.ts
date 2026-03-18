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

  interface MigrationEntry {
    promise: Promise<void>
    oldKey: string
    newName: string
    /** The setting id to delete after migration, or null for in-place key migrations. */
    deleteId: string | null
  }

  const entries: MigrationEntry[] = []
  const prefixDot = namespacePrefix + '.'

  for (const entry of storage.contents.filter((entry: foundry.documents.Setting) => entry.key.startsWith(prefixDot))) {
    const legacyKey = entry.key.slice(prefixDot.length)

    const migration = migrations.find(migration => migration.oldName === legacyKey)

    if (!migration) continue

    // Transform the value and save to new setting.
    // Using Promise.resolve().then() to ensure synchronous errors are caught
    const promise = Promise.resolve()
      .then(() => migration.migrateValue(entry.value))
      .then(newValue => (game.settings as any)!.set(namespacePrefix, migration.newName, newValue))

    // Only delete the old setting if the new setting key is different. This allows for in-place value transformations
    // without key changes, while still ensuring that migrated settings are cleaned up.
    entries.push({
      promise,
      oldKey: entry.key,
      newName: migration.newName,
      deleteId: migration.newName !== migration.oldName ? entry.id : null,
    })
  }

  if (entries.length === 0) return

  console.log(`GURPS | Starting migration of ${entries.length} legacy setting(s) (namespace: ${namespacePrefix})`)

  // Wait for all migration actions to complete before deleting old settings.
  const results = await Promise.allSettled(entries.map(entry => entry.promise))

  // Check for failed migrations so we can skip their deletions and count outcomes.
  const failedIndices = new Set<number>()

  for (const [index, result] of results.entries()) {
    const { oldKey, newName, deleteId } = entries[index]

    if (result.status === 'rejected') {
      // Prefer the stored key for the error label; fall back to the deleteId or oldKey.
      const label = deleteId ? (storage.get(deleteId)?.key ?? deleteId) : oldKey

      console.error(`GURPS | Migration failed for setting: ${label}`, result.reason)
      failedIndices.add(index)
    } else {
      console.log(`GURPS | Migrated setting: ${oldKey} → ${namespacePrefix}.${newName}`)
    }
  }

  // Remove migrated legacy settings so the migration only runs once.
  // Skip entries that failed (so they can be retried on next launch) or have no deleteId (in-place migrations).
  for (const [index, { deleteId }] of entries.entries()) {
    if (!deleteId || failedIndices.has(index)) continue

    const settingToDelete = storage.get(deleteId)

    if (settingToDelete) {
      await settingToDelete.delete()
      console.debug(`GURPS | Deleted migrated legacy setting: ${settingToDelete.key}`)
    }
  }

  // Log summary
  const failedCount = failedIndices.size
  const successCount = results.length - failedCount

  if (failedCount > 0)
    console.warn(`GURPS | Settings migration completed with ${failedCount} failure(s) and ${successCount} success(es)`)

  if (successCount > 0) console.log(`GURPS | Successfully migrated ${successCount} legacy setting(s)`)
}
