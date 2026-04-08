import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { migrateTrackerInstanceToV2 } from './migrations/1_0_0.js'
import { migrations } from './migrations/index.js'
import { TrackerInstance } from './resource-tracker.js'
import { initializeSettings } from './settings.js'
import { IResourceTracker, IResourceTrackerTemplate } from './types.js'
import { ResourceTrackerManagerV2 } from './ui/resource-tracker-manager-v2.js'
import { updateResourceTracker } from './ui/update-resource-tracker.js'

function init() {
  console.log('GURPS | Initializing GURPS Resource Tracker Module')

  Hooks.once('ready', async function () {
    await initializeSettings()

    // @ts-expect-error: Invalid type
    GURPS.CONFIG ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument ||= {}
    GURPS.CONFIG.PseudoDocument.Types.ResourceTracker = TrackerInstance

    // get all aliases defined in the resource tracker templates and register them as damage types
    const resourceTrackers = Object.values(
      ResourceTrackerManagerV2.getAllTemplatesMap() as Record<string, IResourceTrackerTemplate>
    )
      .filter(it => !!it.tracker.isDamageType)
      .filter(it => !!it.tracker.alias)
      .map(it => it.tracker)

    resourceTrackers.forEach(it => (GURPS.DamageTables.damageTypeMap[it.alias] = it.alias))
    resourceTrackers.forEach(
      it =>
        (GURPS.DamageTables.woundModifiers[it.alias] = {
          multiplier: 1,
          label: it.name,
          resource: true,
        })
    )
  })
}

/**
 * @description I suggest creating functions in this interface for any game.settings owned by the module and needed
 * outside the module.
 *
 * @example
 * interface ResourceTrackerModule extends GurpsModule {
 *   TemplateManager: typeof ResourceTrackerManager
 *   getTrackerTemplates(): ResourceTrackerTemplate[]
 *}
 *
 * export const ResourceTracker: ResourceTrackerModule = {
 *  init,
 *  TemplateManager: ResourceTrackerManager,
 *  TrackerEditorV2: ResourceTrackerEditorV2,
 *  getTrackerTemplates(): ResourceTrackerTemplate[] {
 *     return game.settings.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES)
 *   }
 *
 * // From outside the module use this instead of game.settings.get():
 * const templates = ResourceTracker.getTrackerTemplates()
 */
interface ResourceTrackerModule extends GurpsModule {
  updateResourceTracker: typeof updateResourceTracker
  getAllTemplatesMap(): Record<string, IResourceTrackerTemplate>
  getMissingRequiredTemplates(currentTrackers: IResourceTracker[]): IResourceTrackerTemplate[]
  migrateTrackerInstanceToV2(trackerData: any): IResourceTracker
}

export const ResourceTrackerModule: ResourceTrackerModule = {
  init,
  migrations,
  updateResourceTracker,
  getAllTemplatesMap: ResourceTrackerManagerV2.getAllTemplatesMap,
  getMissingRequiredTemplates: ResourceTrackerManagerV2.getMissingRequiredTemplates,
  migrateTrackerInstanceToV2,
}

export type { IResourceTrackerThreshold, IResourceTracker, IResourceTrackerTemplate } from './types.js'

export { ResourceTrackerManagerV2 } from './ui/resource-tracker-manager-v2.js'
export type { ResourceTrackerSchema, ResourceTrackerTemplateSchema } from './resource-tracker.js'
export { TrackerInstance, ResourceTrackerTemplate } from './resource-tracker.js'
export { OperatorFunctions, ComparisonFunctions } from './types.js'
export { ResourceTrackerTemplateMapType } from './settings.js'
