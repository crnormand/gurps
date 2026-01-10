import * as Settings from '../../../lib/miscellaneous-settings.js'
import { GurpsActor } from '../actor.js'
import { confirmAndDelete, openItemSheetIfFoundryItem } from './crud-handler.ts'

export function bindEquipmentCrudActions(html: JQuery, actor: GurpsActor, sheet: GurpsActorSheetEditMethods): void {
  const entityType = 'equipment'

  html.find(`[data-action="add-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const target = event.currentTarget as HTMLElement
    const container = target.dataset.container ?? ''
    const path = `system.equipment.${container}`

    const { Equipment } = await import('../actor-components.js')
    const newEquipment: EquipmentInstance = new Equipment(`${game.i18n!.localize('GURPS.equipment')}...`, true)

    if (game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      newEquipment.save = true
      const payload = newEquipment.toItemData(actor, '')
      const [item] = await actor.createEmbeddedDocuments('Item', [payload] as never)
      newEquipment.itemid = (item as { _id: string })._id
    }

    if (!newEquipment.uuid) {
      newEquipment.uuid = newEquipment._getGGAId({ name: newEquipment.name ?? '', type: container, generator: '' })
    }

    const list = GURPS.decode<Record<string, EquipmentComponent>>(actor, path) || {}
    GURPS.put(list, foundry.utils.duplicate(newEquipment) as EquipmentComponent)
    await actor.internalUpdate({ [path]: list })
  })

  html.find(`[data-action="edit-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const equipmentPath = target.dataset.key ?? ''
    const equipmentData = foundry.utils.duplicate(GURPS.decode<EquipmentComponent>(actor, equipmentPath))

    if (await openItemSheetIfFoundryItem(actor, equipmentData)) return

    await sheet.editEquipment(actor, equipmentPath, equipmentData)
  })

  html.find(`[data-action="delete-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const equipmentKey = target.dataset.key ?? ''
    const equipmentData = GURPS.decode<EquipmentComponent>(actor, equipmentKey)

    const confirmed = await confirmAndDelete(actor, equipmentKey, equipmentData?.name, 'GURPS.equipment')
    if (!confirmed) return

    if (!game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)) {
      await actor.deleteEquipment(equipmentKey)
      await actor.refreshDR()
      return
    }

    const item = actor.items.get(equipmentData?.itemid ?? '')
    if (item && item.id) {
      await actor._removeItemAdditions(item.id)
      await actor.deleteEmbeddedDocuments('Item', [item.id])
      GURPS.removeKey(actor, equipmentKey)
      await actor.refreshDR()
    }
  })
}

export function bindNoteCrudActions(html: JQuery, actor: GurpsActor, sheet: GurpsActorSheetEditMethods): void {
  const entityType = 'note'
  const path = 'system.notes'

  html.find(`[data-action="add-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const { Note } = await import('../actor-components.js')
    const list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path) as Record<string, NoteComponent>) || {}
    const newNote = new Note('', true) as NoteComponent

    const dialogContent = await renderTemplate(
      'systems/gurps/templates/note-editor-popup.hbs',
      newNote as Record<string, string>
    )

    new Dialog({
      title: 'Note Editor',
      content: dialogContent,
      buttons: {
        one: {
          label: 'Create',
          callback: async (dialogHtml: JQuery) => {
            newNote.notes = dialogHtml.find('.notes').val() as string
            newNote.title = dialogHtml.find('.title').val() as string
            GURPS.put(list, newNote)
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
    const notePath = target.dataset.key ?? ''
    const noteData = foundry.utils.duplicate(GURPS.decode<NoteComponent>(actor, notePath))
    await sheet.editNotes(actor, notePath, noteData)
  })

  html.find(`[data-action="delete-${entityType}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const noteKey = target.dataset.key ?? ''
    const noteData = GURPS.decode<NoteComponent>(actor, noteKey)

    const confirmed = await confirmAndDelete(actor, noteKey, noteData?.notes, 'GURPS.notes')
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
