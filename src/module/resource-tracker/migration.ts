import { migrateLegacySettings, SettingMigration } from '@module/util/migration/settings-migration.js'
import { objectToArray } from '@util/utilities.js'

import { ResourceTrackerTemplate } from './resource-tracker.js'
import { OLD_SETTING_TEMPLATES, SETTING_TRACKER_TEMPLATES } from './types.js'

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

  for (const oldTemplate of objectToArray(oldTemplates)) {
    const id = foundry.utils.randomID()
    const newTemplate = new ResourceTrackerTemplate({
      tracker: {
        ...oldTemplate.tracker,
        isAccumulator: oldTemplate.tracker.isDamageTracker ?? false,
        useBreakpoints: oldTemplate.tracker.breakpoints ?? false,
      },
      initialValue: oldTemplate.initialValue,
      autoapply: !!oldTemplate.slot,
      id,
    })

    // remove old slot field if it exists
    if ('slot' in newTemplate) {
      delete (newTemplate as Record<string, unknown>).slot
    }

    // remove old isDamageTracker field if it exists
    if ('isDamageTracker' in newTemplate.tracker) {
      delete (newTemplate.tracker as Record<string, unknown>).isDamageTracker
    }

    // remove old breakpoints field if it exists
    if ('breakpoints' in newTemplate.tracker) {
      delete (newTemplate.tracker as Record<string, unknown>).breakpoints
    }

    newTemplates[id] = newTemplate
  }

  return newTemplates
}

export async function migrate(): Promise<void> {
  await migrateLegacySettings(GURPS.SYSTEM_NAME, legacyMigrations)
}
