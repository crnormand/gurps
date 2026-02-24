import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { migrate } from './migration.ts'
import { ResourceTrackerEditor } from './resource-tracker-editor.js'
import { ResourceTrackerManager } from './resource-tracker-manager.js'
import { initializeSettings } from './settings.ts'

function init() {
  console.log('GURPS | Initializing GURPS Resource Tracker Module')

  Hooks.once('ready', async function () {
    await initializeSettings()
    await migrate()

    // get all aliases defined in the resource tracker templates and register them as damage types
    const resourceTrackers = ResourceTrackerManager.getAllTemplates()
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
 *   TrackerEditor: typeof ResourceTrackerEditor
 *   getTrackerTemplates(): ResourceTrackerTemplate[]
 *}
 *
 * export const ResourceTracker: ResourceTrackerModule = {
 *  init,
 *  TemplateManager: ResourceTrackerManager,
 *  TrackerEditor: ResourceTrackerEditor,
 *  getTrackerTemplates(): ResourceTrackerTemplate[] {
 *     return game.settings.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES)
 *   }
 *
 * // From outside the module use this instead of game.settings.get():
 * const templates = ResourceTracker.getTrackerTemplates()
 */
interface ResourceTrackerModule extends GurpsModule {
  TemplateManager: typeof ResourceTrackerManager
  TrackerEditor: typeof ResourceTrackerEditor
}

export const ResourceTracker: ResourceTrackerModule = {
  init,
  migrate,
  TemplateManager: ResourceTrackerManager,
  TrackerEditor: ResourceTrackerEditor,
}
