import { migrateLegacySettings, SettingMigration } from '@module/util/migration/settings-migration.js'
import { objectToArray } from '@util/utilities.js'

import { ResourceTrackerTemplate } from './resource-tracker.ts'
import { OLD_SETTING_TEMPLATES, SETTING_TRACKER_TEMPLATES } from './types.ts'

/**
 * Array of migration configurations for legacy resource tracker settings.
 * Each configuration specifies the old setting name, new setting name, and a function to transform the value.
 */
const legacyMigrations: SettingMigration[] = [
  {
    oldName: OLD_SETTING_TEMPLATES,
    newName: SETTING_TRACKER_TEMPLATES,
    migrateValue: (value: unknown) => convertOldSettings(value as Record<string, ResourceTrackerTemplate>),
  },
]

function convertOldSettings(
  oldTemplates: Record<string, ResourceTrackerTemplate>
): Record<string, ResourceTrackerTemplate> {
  if (!game.settings) throw new Error('GURPS | Game settings not found')

  const newTemplates: Record<string, ResourceTrackerTemplate> = {}

  // Copy each field of oldTemplates to newTemplates, converting "slot" to "autoapply" if needed
  for (const oldTemplate of objectToArray(oldTemplates)) {
    const newTemplate = new ResourceTrackerTemplate({
      tracker: {
        ...oldTemplate.tracker,
      },
      initialValue: oldTemplate.initialValue,
      autoapply: !!oldTemplate.slot,
    })

    newTemplates[oldTemplate.tracker.name] = newTemplate
  }

  return newTemplates
}

export async function migrate(): Promise<void> {
  await migrateLegacySettings(GURPS.SYSTEM_NAME, legacyMigrations)
}
