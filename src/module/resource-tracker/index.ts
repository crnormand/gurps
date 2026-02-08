import type { GurpsModule } from '@gurps-types/gurps-module.js'
import { arrayToObject, objectToArray } from '@util/utilities.js'

import { ResourceTrackerEditor } from './resource-tracker-editor.js'
import { ResourceTrackerManager } from './resource-tracker-manager.js'
import { ResourceTrackerTemplate } from './resource-tracker.js'
import { OLD_SETTING_TEMPLATES, SETTING_TRACKER_EDITOR, SETTING_TRACKER_TEMPLATES } from './types.js'

function init() {
  console.log('GURPS | Initializing GURPS Resource Tracker Module')

  Hooks.once('ready', async function () {
    if (!game.settings) throw new Error('GURPS | Game settings not found')
    if (!game.i18n) throw new Error('GURPS | Game i18n not found')

    // TODO: Remove this when the setting is removed.
    game.settings.register(GURPS.SYSTEM_NAME, OLD_SETTING_TEMPLATES, {
      name: game.i18n.localize('GURPS.resourceTemplateTitle'),
      scope: 'world',
      config: false,
      type: Object as any,
      default: ResourceTrackerManager.getDefaultTemplates() as any,
      onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
    })

    game.settings.registerMenu(GURPS.SYSTEM_NAME, SETTING_TRACKER_EDITOR, {
      name: game.i18n.localize('GURPS.resourceTemplateManager'),
      hint: game.i18n.localize('GURPS.resourceTemplateHint'),
      label: game.i18n.localize('GURPS.resourceTemplateButton'),
      type: ResourceTrackerManager,
      restricted: true,
      icon: 'fa-solid fa-square-dashed-circle-plus',
    })

    game.settings.register(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, {
      name: game.i18n.localize('GURPS.resourceTemplateTitle'),
      scope: 'world',
      config: false,
      type: Object as any,
      // Copy the old settings to the new one.
      // TODO Reset to this when the setting is removed: `ResourceTrackerManager.getDefaultTemplates()`
      default: (await convertOldSettings(game.settings.get(GURPS.SYSTEM_NAME, OLD_SETTING_TEMPLATES))) as any,
      onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
    })

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

// Migrate old settings to the new setting if present
async function convertOldSettings(
  oldTemplates: Record<string, ResourceTrackerTemplate>
): Promise<Record<string, ResourceTrackerTemplate>> {
  if (!game.settings) throw new Error('GURPS | Game settings not found')

  const newTemplates: ResourceTrackerTemplate[] = []

  // Copy each field of oldTemplates to newTemplates, converting "slot" to "autoapply" if needed
  for (const oldTemplate of objectToArray(oldTemplates)) {
    const newTemplate = new ResourceTrackerTemplate({
      tracker: {
        ...oldTemplate.tracker,
      },
      initialValue: oldTemplate.initialValue,
      autoapply: !!oldTemplate.slot,
    })

    newTemplates.push(newTemplate)
  }

  return arrayToObject(newTemplates)
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
  TemplateManager: ResourceTrackerManager,
  TrackerEditor: ResourceTrackerEditor,
}
