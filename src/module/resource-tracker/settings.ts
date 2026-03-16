import { ResourceTrackerManager } from './resource-tracker-manager.js'
import { fields } from '@gurps-types/foundry/index.js'

import { SETTING_TRACKER_EDITOR, SETTING_TRACKER_TEMPLATES } from './types.js'
import { resourceTrackerTemplateSchema } from './resource-tracker.js'

export async function initializeSettings() {
  if (!game.settings) throw new Error('GURPS | Game settings not found')
  if (!game.i18n) throw new Error('GURPS | Game i18n not found')

  game.settings.registerMenu(GURPS.SYSTEM_NAME, SETTING_TRACKER_EDITOR, {
    name: game.i18n.localize('GURPS.resourceTracker.template.title'),
    hint: game.i18n.localize('GURPS.resourceTracker.template.hint'),
    label: game.i18n.localize('GURPS.resourceTracker.template.button'),
    type: ResourceTrackerManager,
    restricted: true,
    icon: 'fa-solid fa-square-dashed-circle-plus',
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, {
    name: 'GURPS.resourceTracker.template.title',
    scope: 'world',
    config: false,
    type: new fields.TypedObjectField(
      new fields.SchemaField(resourceTrackerTemplateSchema(), { required: true, nullable: false }),
      {
        required: true,
        nullable: false,
      }
    ),
    default: ResourceTrackerManager.getDefaultTemplates(),
    onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
  })
}
