import { confirmAndDelete, openItemSheetIfFoundryItem } from './crud-handler.ts'
import { getGame, isHTMLElement } from '../../types/guards.ts'

export function bindEquipmentCrudActions(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: GurpsActorSheetEditMethods
): void {
  const entityType = 'equipment'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add-${entityType}"]`)
  addButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      const target = event.currentTarget
      if (!isHTMLElement(target)) return
      const container = target.dataset.container ?? ''
      const path = `system.equipment.${container}`

      const { Equipment } = await import('../actor-components.js')
      const newEquipment = new Equipment(`${getGame().i18n.localize('GURPS.equipment')}...`, true)
      newEquipment.save = true
      const payload = newEquipment.toItemData(actor, '')
      const [item] = await actor.createEmbeddedDocuments('Item', [payload] as never)
      newEquipment.itemid = (item as { _id: string })._id

      if (!newEquipment.uuid) {
        newEquipment.uuid = newEquipment._getGGAId({ name: newEquipment.name ?? '', type: container, generator: '' })
      }

      const list = GURPS.decode<Record<string, EquipmentComponent>>(actor, path) || {}
      GURPS.put(list, foundry.utils.duplicate(newEquipment) as EquipmentComponent)
      await actor.internalUpdate({ [path]: list })
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit-${entityType}"]`)
  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      if (!isHTMLElement(target)) return
      const equipmentPath = target.dataset.key ?? ''
      const equipmentData = foundry.utils.duplicate(GURPS.decode<EquipmentComponent>(actor, equipmentPath))

      if (await openItemSheetIfFoundryItem(actor, equipmentData)) return

      await sheet.editEquipment(actor, equipmentPath, equipmentData)
    })
  })

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete-${entityType}"]`)
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      if (!isHTMLElement(target)) return
      const equipmentKey = target.dataset.key ?? ''
      const equipmentData = GURPS.decode<EquipmentComponent>(actor, equipmentKey)

      const confirmed = await confirmAndDelete(actor, equipmentKey, equipmentData?.name, 'GURPS.equipment')
      if (!confirmed) return

      await actor.deleteEquipment(equipmentKey)
      await actor.refreshDR()
    })
  })
}

export function bindNoteCrudActions(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: GurpsActorSheetEditMethods
): void {
  const entityType = 'note'
  const path = 'system.notes'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add-${entityType}"]`)
  addButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      const { Note } = await import('../actor-components.js')
      const list = foundry.utils.duplicate(foundry.utils.getProperty(actor, path) as Record<string, NoteComponent>) || {}
      const newNote = new Note('', true) as NoteComponent

      const dialogContent = await foundry.applications.handlebars.renderTemplate(
        'systems/gurps/templates/note-editor-popup.hbs',
        newNote as Record<string, string>
      )

      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Note Editor' },
        content: dialogContent,
        buttons: [
          {
            action: 'create',
            label: 'Create',
            icon: 'fas fa-plus',
            callback: (_event: Event, button: HTMLButtonElement) => {
              const form = button.form
              if (!form) return
              const notesInput = form.querySelector('.notes')
              const titleInput = form.querySelector('.title')
              newNote.notes = notesInput instanceof HTMLTextAreaElement ? notesInput.value : ''
              newNote.title = titleInput instanceof HTMLInputElement ? titleInput.value : ''
              GURPS.put(list, newNote)
              actor.internalUpdate({ [path]: list } as Actor.UpdateData)
            },
          },
        ],
      })
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit-${entityType}"]`)
  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      if (!isHTMLElement(target)) return
      const notePath = target.dataset.key ?? ''
      const noteData = foundry.utils.duplicate(GURPS.decode<NoteComponent>(actor, notePath))
      await sheet.editNotes(actor, notePath, noteData)
    })
  })

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete-${entityType}"]`)
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      if (!isHTMLElement(target)) return
      const noteKey = target.dataset.key ?? ''
      const noteData = GURPS.decode<NoteComponent>(actor, noteKey)

      const confirmed = await confirmAndDelete(actor, noteKey, noteData?.notes, 'GURPS.notes')
      if (confirmed) {
        await actor.refreshDR()
      }
    })
  })
}

export function bindTrackerActions(html: HTMLElement, actor: Actor.Implementation): void {
  const addButtons = html.querySelectorAll<HTMLElement>('[data-action="add-tracker"]')
  addButtons.forEach(button => {
    button.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()
      actor.addTracker()
    })
  })
}
