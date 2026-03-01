import { ResourceTrackerManager } from './resource-tracker-manager.ts'
import { SETTING_TRACKER_EDITOR, SETTING_TRACKER_TEMPLATES } from './types.ts'

export async function initializeSettings() {
  if (!game.settings) throw new Error('GURPS | Game settings not found')
  if (!game.i18n) throw new Error('GURPS | Game i18n not found')

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
    default: ResourceTrackerManager.getDefaultTemplates(),
    onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
  })
}
