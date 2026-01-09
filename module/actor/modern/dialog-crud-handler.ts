import { confirmAndDelete, openItemSheetIfFoundryItem } from './crud-handler.ts'

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
      const target = event.currentTarget as HTMLElement
      const container = target.dataset.container ?? ''
      const path = `system.equipment.${container}`

      const { Equipment } = await import('../actor-components.js')
      const newEquipment = new Equipment(`${game.i18n!.localize('GURPS.equipment')}...`, true)
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
      const target = event.currentTarget as HTMLElement
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
      const target = event.currentTarget as HTMLElement
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
              // HACK: to fix type here
              await actor.internalUpdate({ [path as keyof typeof actor]: list })
            },
          },
        },
        default: 'one',
      }).render(true)
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit-${entityType}"]`)
  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget as HTMLElement
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
      const target = event.currentTarget as HTMLElement
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
