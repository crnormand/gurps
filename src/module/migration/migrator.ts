import { getGame } from '@module/util/guards.js'

import { v1_0_0 } from './migrations/index.js'
import { MigrationEntry, MigrationReport } from './types.js'

export class Migrator {
  #migrationReports: MigrationReport[]

  constructor() {
    this.#migrationReports = []
  }

  /* ---------------------------------------- */

  static migrations: MigrationEntry[] = [v1_0_0]

  /* ---------------------------------------- */

  static get globalMigrator(): Migrator {
    if (!GURPS.migrator) {
      GURPS.migrator = new Migrator()
    }

    return GURPS.migrator
  }

  /* ---------------------------------------- */

  static async migrateWorld(): Promise<void> {
    await this.globalMigrator.#migrateWorld()
    await this.globalMigrator.#showMigrationReport()
  }

  /* ---------------------------------------- */

  async #migrateWorld(): Promise<void> {
    const migrationVersion = getGame().settings.get(GURPS.SYSTEM_NAME, 'migration-version') ?? '0.0.0'

    // Set the migration version now, so if any migrations fail, we won't be stuck in a loop of trying to run them every
    // time the game is loaded.
    getGame().settings.set(GURPS.SYSTEM_NAME, 'migration-version', getGame().system.version)

    const migrationVersions = Object.values(GURPS.modules).reduce((versions, module) => {
      if (module.migrations) {
        module.migrations.forEach(migration => versions.add(migration.version))
      }

      return versions
    }, new Set<string>())

    for (const version of migrationVersions) {
      if (foundry.utils.isNewerVersion(version, migrationVersion)) {
        const migrationEntry = Migrator.migrations.find(migration => migration.version === version)

        if (migrationEntry) {
          await migrationEntry.migrate()
        }

        for (const [name, module] of Object.entries(GURPS.modules)) {
          if (module.migrations) {
            const migrationEntry = module.migrations.find(migration => migration.version === version)

            if (migrationEntry) {
              console.log(`GURPS | Running migration for module ${name} (version: ${migrationEntry.version})`)

              const report = await migrationEntry.migrate()

              if (report) this.#migrationReports.push(report)
            }
          }
        }
      }
    }
  }

  /* ---------------------------------------- */

  async #showMigrationReport(): Promise<void> {
    if (this.#migrationReports.length === 0) return

    await foundry.applications.api.DialogV2.prompt({
      window: { title: 'GURPS.migration.migrationReport.title' },
      content:
        `<p>${getGame().i18n.localize('GURPS.migration.migrationReport.message')}</p>` +
        this.#migrationReports
          .map(
            entry => `<p>${entry.success ? '✅' : '❌'} ${entry.module} (${entry.version}): ${entry.message ?? ''}</p>`
          )
          .join(''),
    })
  }
}
