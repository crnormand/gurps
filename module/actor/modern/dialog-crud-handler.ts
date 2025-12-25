import * as Settings from '../../../lib/miscellaneous-settings.js'
import { GurpsActor } from '../actor.js'
import { GurpsActorSheet } from '../actor-sheet.js'
import { confirmAndDelete } from './crud-handler.js'

export function bindEquipmentCrudActions(html: JQuery, actor: GurpsActor, sheet: GurpsActorSheet): void {
  const entityType = 'equipment'

  html.find(`[data-action="add-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    const container = target.dataset.container ?? ''
    const path = `system.equipment.${container}`
    const { Equipment } = await import('../actor-components.js')
    const obj = new Equipment(`${game.i18n!.localize('GURPS.equipment')}...`, true)
    if (game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS as any)) {
      obj.save = true
      const payload = obj.toItemData(actor, '') as any
      const [item] = await actor.createEmbeddedDocuments('Item', [payload])
      obj.itemid = (item as { _id: string })._id
    }
    if (!obj.uuid) obj.uuid = obj._getGGAId({ name: obj.name, type: container, generator: '' })
    const list = GURPS.decode<Record<string, unknown>>(actor, path) || {}
    GURPS.put(list, foundry.utils.duplicate(obj))
    await actor.internalUpdate({ [path]: list })
  })

  html.find(`[data-action="edit-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const path = target.dataset.key ?? ''
    const obj = foundry.utils.duplicate(GURPS.decode(actor, path))
    await sheet.editEquipment(actor, path, obj)
  })

  html.find(`[data-action="delete-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.key ?? ''
    const obj = GURPS.decode<{ name?: string; itemid?: string }>(actor, key)
    const confirmed = await confirmAndDelete(actor, key, obj?.name, 'GURPS.equipment')
    if (confirmed) {
      if (!game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS as any)) {
        await actor.deleteEquipment(key)
        await actor.refreshDR()
      } else {
        const item = actor.items.get(obj?.itemid ?? '')
        if (item && item.id) {
          await actor._removeItemAdditions(item.id)
          await actor.deleteEmbeddedDocuments('Item', [item.id])
          GURPS.removeKey(actor, key)
          await actor.refreshDR()
        }
      }
    }
  })
}

export function bindNoteCrudActions(html: JQuery, actor: GurpsActor, sheet: GurpsActorSheet): void {
  const entityType = 'note'
  const path = 'system.notes'

  html.find(`[data-action="add-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const { Note } = await import('../actor-components.js')
    const list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path) as Record<string, unknown>) || {}
    const obj = new Note('', true) as any
    const dlgHtml = await renderTemplate('systems/gurps/templates/note-editor-popup.hbs', obj)
    new Dialog({
      title: 'Note Editor',
      content: dlgHtml,
      buttons: {
        one: {
          label: 'Create',
          callback: async (dialogHtml: JQuery) => {
            obj.notes = dialogHtml.find('.notes').val() as string
            obj.title = dialogHtml.find('.title').val() as string
            GURPS.put(list, obj)
            await actor.internalUpdate({ [path]: list })
          },
        },
      },
      default: 'one',
    }).render(true)
  })

  html.find(`[data-action="edit-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.key ?? ''
    const obj = foundry.utils.duplicate(GURPS.decode(actor, key))
    await sheet.editNotes(actor, key, obj)
  })

  html.find(`[data-action="delete-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.key ?? ''
    const obj = GURPS.decode<{ notes?: string }>(actor, key)
    const confirmed = await confirmAndDelete(actor, key, obj?.notes, 'GURPS.notes')
    if (confirmed) {
      await actor.refreshDR()
    }
  })
}

export function bindTrackerActions(html: JQuery, actor: GurpsActor): void {
  html.find('[data-action="add-tracker"]').on('click', (event: JQuery.ClickEvent) => {
    event.preventDefault()
    actor.addTracker()
  })
}
