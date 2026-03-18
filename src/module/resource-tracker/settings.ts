import { ResourceTrackerManagerV2 } from './ui/resource-tracker-manager-v2.ts'
import { IResourceTrackerTemplate, SETTING_TRACKER_EDITOR, SETTING_TRACKER_TEMPLATES } from './types.js'

type ResourceTrackerTemplateMap = Record<string, IResourceTrackerTemplate>
type ResourceTrackerTemplateMapConstructor = ObjectConstructor & {
  new (): ResourceTrackerTemplateMap
  (): ResourceTrackerTemplateMap
}

export const ResourceTrackerTemplateMapType = Object as unknown as ResourceTrackerTemplateMapConstructor

export async function initializeSettings() {
  if (!game.settings) throw new Error('GURPS | Game settings not found')
  if (!game.i18n) throw new Error('GURPS | Game i18n not found')

  game.settings.registerMenu(GURPS.SYSTEM_NAME, SETTING_TRACKER_EDITOR, {
    name: game.i18n.localize('GURPS.resourceTracker.template.title'),
    hint: game.i18n.localize('GURPS.resourceTracker.template.hint'),
    label: game.i18n.localize('GURPS.resourceTracker.template.button'),
    type: ResourceTrackerManagerV2,
    restricted: true,
    icon: 'fa-solid fa-square-dashed-circle-plus',
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, {
    name: 'GURPS.resourceTracker.template.title',
    scope: 'world',
    config: false,
    type: ResourceTrackerTemplateMapType,
    default: ResourceTrackerManagerV2.getDefaultTemplates(),
    onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
  })
}
