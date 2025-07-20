import * as Settings from '../../lib/miscellaneous-settings.js'
import { SemanticVersion } from '../../lib/semver.js'
import { fixBadDamageChatMessages } from './migrations/fix-bad-damage-chat-messages.js'
import { showConfirmationDialogIfAutoAddIsTrue } from './migrations/show-confirmation-dialog-if-auto-add-is-true.js'

class MigrationRunner {
  currentVersion: SemanticVersion
  migrationVersion: SemanticVersion
  migrations: Array<() => Promise<void>> = []

  /* ---------------------------------------- */

  constructor() {
    const currentVersion = SemanticVersion.fromString(
      game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION) ?? '0.0.0'
    )
    if (!currentVersion) {
      throw new Error('Invalid current version format')
    }

    const migrationVersion = SemanticVersion.fromString(game.system?.version ?? '0.0.0')
    if (!migrationVersion) {
      throw new Error('Invalid migration version format')
    }

    this.currentVersion = currentVersion
    this.migrationVersion = migrationVersion

    /**
     * To add a new migration, add a new function to this array.
     * The function should take care of determining if the migration is needed.
     *
     * All migrations should be idempotent (i.e. they should be able to run multiple times without causing issues):
     *
     * - If a migration is not needed, it should return early.
     * - If a migration is needed, it should perform the migration and return a promise.
     * - If a migration fails, it should log the error and continue with the next migration.
     * - If a migration is successful, it should log the success message.
     */
    this.migrations = [showConfirmationDialogIfAutoAddIsTrue.bind(this), fixBadDamageChatMessages.bind(this)]
  }

  /* ---------------------------------------- */

  static run() {
    const runner = new MigrationRunner()
    runner.run()
  }

  /* ---------------------------------------- */

  run() {
    for (const migration of this.migrations) {
      migration()
        .then(() => {
          console.log(`Migration completed successfully: ${migration.name}`)
        })
        .catch(error => {
          console.error(`Migration failed: ${migration.name}`, error)
        })
    }
  }
}

/* ---------------------------------------- */

export { MigrationRunner }
