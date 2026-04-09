import { migrateLegacySettings, SettingMigration } from '@module/util/migration/settings-migration.js'
import { objectToArray } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { ResourceTrackerTemplate } from '../resource-tracker.js'
import { IResourceTracker, OLD_SETTING_TEMPLATES, SETTING_TRACKER_TEMPLATES } from '../types.js'

const MIGRATION_VERSION = '1.0.0-alpha'

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
    const newTemplate = new ResourceTrackerTemplate(migrateTemplateToV2(oldTemplate))

    newTemplates[newTemplate.id] = newTemplate
  }

  return newTemplates
}

/**
 * Given a legacy template object, creates a new ResourceTrackerTemplate instance with the appropriate properties.
 * @param oldTemplate
 * @returns A new ResourceTrackerTemplate instance with properties mapped from the legacy template.
 */
export function migrateTemplateToV2(oldTemplate: any) {
  const tracker = migrateTrackerInstanceToV2(oldTemplate.tracker)

  if (oldTemplate.initialValue !== undefined && oldTemplate.initialValue !== null && oldTemplate.initialValue !== '') {
    tracker.initialValue = oldTemplate.initialValue as string
  }

  const template = {
    tracker,
    autoapply: !!oldTemplate.slot,
    id: foundry.utils.randomID(),
  }

  return template
}

/**
 * Given a legacy tracker instance object, creates a new IResourceTracker instance with the appropriate properties.
 * @param instanceV1
 * @returns A new IResourceTracker instance with properties mapped from the legacy instance.
 */
export function migrateTrackerInstanceToV2(instanceV1: AnyObject): IResourceTracker {
  const legacyInitialValue = instanceV1.initialValue as string | null | undefined
  const legacyMax = instanceV1.max as number | undefined

  // Prefer the existing initialValue; fall back to max when initialValue is absent or empty.
  const initialValue =
    legacyInitialValue !== undefined && legacyInitialValue !== null && legacyInitialValue !== ''
      ? legacyInitialValue
      : legacyMax !== undefined
        ? String(legacyMax)
        : null

  return {
    _id: foundry.utils.randomID(),
    name: instanceV1.name as string,
    alias: (instanceV1.alias as string) ?? '',
    pdf: (instanceV1.pdf as string) ?? '',
    isDamageType: (instanceV1.isDamageType as boolean) ?? false,
    isAccumulator: (instanceV1.isDamageTracker as boolean) ?? false,
    isMaxEnforced: (instanceV1.isMaximumEnforced as boolean) ?? false,
    isMinEnforced: (instanceV1.isMinimumEnforced as boolean) ?? false,
    useBreakpoints: (instanceV1.breakpoints as boolean) ?? false,
    min: (instanceV1.min as number) ?? 0,
    currentValue: (instanceV1.value as number | null) ?? null,
    initialValue,
    thresholds: (instanceV1.thresholds as IResourceTracker['thresholds']) ?? [],
  }
}

async function migrate(): Promise<void> {
  await migrateLegacySettings(GURPS.SYSTEM_NAME, legacyMigrations)
}

export const v1_0_0 = { version: MIGRATION_VERSION, migrate }
