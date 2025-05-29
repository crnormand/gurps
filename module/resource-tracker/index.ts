import { ResourceTrackerManager } from './resource-tracker-manager.js'
import { SETTING_TRACKER_EDITOR, SETTING_TRACKER_TEMPLATES } from './types.js'

const OLD_SETTING_TEMPLATES = 'tracker-templates'
export function init() {
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
      // @ts-expect-error Foundry types do not allow default for Object, but we need it
      default: ResourceTrackerManager.getDefaultTemplates(),
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
      // @ts-expect-error Foundry types do not allow default for Object, but we need it
      default: ResourceTrackerManager.getDefaultTemplates(),
      onChange: value => console.log(`Updated Default Resource Trackers: ${JSON.stringify(value)}`),
    })

    // get all aliases defined in the resource tracker templates and register them as damage types
    let resourceTrackers = ResourceTrackerManager.getAllTemplates()
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

export function migrate() {
  if (!game.settings) throw new Error('GURPS | Game settings not found')

  const oldTemplates = game.settings.get(GURPS.SYSTEM_NAME, OLD_SETTING_TEMPLATES) || null
  const newTemplates = game.settings.get(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES) || null

  if (oldTemplates && !newTemplates) {
    console.log('GURPS | Migrating resource tracker templates to new setting')
    game.settings.set(GURPS.SYSTEM_NAME, SETTING_TRACKER_TEMPLATES, oldTemplates)
    console.log('GURPS | Resource tracker templates migrated successfully')
  }
}
