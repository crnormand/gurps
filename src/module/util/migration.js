import * as Settings from '@module/util/miscellaneous-settings.js'
import { SemanticVersion } from '@util/semver.js'

export class Migration {
  constructor() {
    this.currentVersion = SemanticVersion.fromString(
      game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION)
    )
    this.migrationVersion = SemanticVersion.fromString(game.system.version)

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
    this.migrations = [
      this.showConfirmationDialogIfAutoAddIsTrue.bind(this), // show confirmation dialog if autoAdd is true
      this.migrateBadDamageChatMessages.bind(this), // migrate bad damage chat messages
    ]
  }

  static run() {
    const migration = new Migration()

    migration.runMigrations()
  }

  runMigrations() {
    for (const migration of this.migrations) {
      migration()
        .then(() => {
          console.log(`Migration ${migration.name} completed successfully.`)
        })
        .catch(error => {
          console.error(`Migration ${migration.name} failed:`, error)
        })
    }
  }

  async showConfirmationDialogIfAutoAddIsTrue() {
    if (this.migrationVersion.isHigherThan(this.currentVersion)) {
      const taggedModifiers = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)

      if (!taggedModifiers) {
        return
      }

      if (taggedModifiers.autoAdd) {
        game.settings.set(GURPS.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true)
      }
    }
  }

  async migrateBadDamageChatMessages() {
    const chatMessages = game.messages.contents.filter(message =>
      message.content.includes('<div class="damage-chat-message">')
    )

    for (const message of chatMessages) {
      if (!message.flags?.gurps?.transfer) {
        const transfer = message.flags.transfer

        await message.update({ 'flags.gurps.transfer': JSON.parse(transfer) })
      } else {
        console.debug(`Already migrated: ${message.id}:`, message.flags)
      }
    }
    // }
  }
}
