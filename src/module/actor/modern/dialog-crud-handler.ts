import { getGame, isHTMLElement } from '@module/util/guards.js'
import { ThresholdDescriptor } from '@rules/injury/hit-points.js'

import { confirmAndDelete, openItemSheetIfFoundryItem } from './crud-handler.js'

export function bindEquipmentCrudActions(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: GurpsActorSheetEditMethods
): void {
  const entityType = 'Equipment'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add${entityType}"]`)

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

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit${entityType}"]`)

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

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete${entityType}"]`)

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

      await actor.refreshDR()
    })
  })
}

export function bindNoteCrudActions(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: GurpsActorSheetEditMethods
): void {
  const entityType = 'Note'
  const path = 'system.notes'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add${entityType}"]`)

  addButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      const { Note } = await import('../actor-components.js')
      const list =
        foundry.utils.duplicate(foundry.utils.getProperty(actor, path) as Record<string, NoteComponent>) || {}
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

              return actor.internalUpdate({ [path]: list } as Actor.UpdateData)
            },
          },
        ],
      })
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit${entityType}"]`)

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

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete${entityType}"]`)

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
  const path = 'system.additionalresources.tracker'
  const entityType = 'Tracker'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add${entityType}"]`)

  addButtons.forEach(button => {
    button.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()

      const trackerData = {
        _id: foundry.utils.randomID(),
        name: '',
        currentValue: null,
        initialValue: '',
        min: 0,
        alias: '',
        pdf: '',
        isMaxEnforced: false,
        isMinEnforced: false,
        isDamageType: false,
        isAccumulator: false,
        useBreakpoints: false,
        thresholds: [],
      }

      actor.update({ [path]: { [trackerData._id]: trackerData } } as Actor.UpdateData)

      // actor.addTracker()
    })
  })

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete${entityType}"]`)

  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const trackerKey = target.dataset.key ?? ''
      const tracker = actor.system.additionalresources?.tracker?.get(trackerKey)

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: trackerKey }))

        return
      }

      const confirmed = await confirmAndDelete(
        actor,
        `${path}.${trackerKey}`,
        tracker.name,
        game.i18n!.format('GURPS.resourceTracker.trackerNamed', { name: tracker.name }),
        async _ => {
          await tracker.delete()
        }
      )

      // TODO: Make DR modifiers derived rather than persisted.
      if (confirmed) {
        await actor.refreshDR()
      }
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit${entityType}"]`)

  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const trackerKey = target.dataset.key ?? ''
      const tracker = actor.system.additionalresources?.tracker?.get(trackerKey)

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: trackerKey }))

        return
      }

      await GURPS.modules.ResourceTracker.updateResourceTracker(actor, tracker)
    })
  })

  const decreaseButtons = html.querySelectorAll<HTMLElement>(`[data-action="decrease${entityType}"]`)

  decreaseButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const trackerKey = target.dataset.key ?? ''
      const tracker = actor.system.additionalresources?.tracker?.get(trackerKey)

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: trackerKey }))

        return
      }

      tracker.value = tracker.value - 1
    })
  })

  const increaseButtons = html.querySelectorAll<HTMLElement>(`[data-action="increase${entityType}"]`)

  increaseButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const trackerKey = target.dataset.key ?? ''
      const tracker = actor.system.additionalresources?.tracker?.get(trackerKey)

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: trackerKey }))

        return
      }

      tracker.value = tracker.value + 1
    })
  })

  const resetButtons = html.querySelectorAll<HTMLElement>(`[data-action="reset${entityType}"]`)

  resetButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const trackerKey = target.dataset.key ?? ''
      const tracker = actor.system.additionalresources?.tracker?.get(trackerKey)

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: trackerKey }))

        return
      }

      tracker.resetValue()
    })
  })
}

export type PreparedTrackerData = {
  id: string
  name: string
  value: number
  min: number
  max: number
  state: string
  color: string | null
  pdf: string
  alias: string
  thresholds: {
    comparison: string
    operator: string
    value: number
    state: string
    color: string | null
  }[]
  descriptors: ThresholdDescriptor[]
}

export function prepareTrackerDataForSheet(actor: Actor.Implementation): PreparedTrackerData[] {
  const trackers = actor.system.additionalresources?.tracker.contents

  if (!trackers) return []

  // Convert from Record<string, Tracker> to array of PreparedTrackerData for easier handling in templates.
  const preparedData: PreparedTrackerData[] = []

  let index = 0

  for (const [_key, tracker] of trackers.entries()) {
    const trackerId = String(tracker.id)

    preparedData.push({
      id: trackerId,
      name: tracker.name
        ? game.i18n!.localize(tracker.name)
        : `${game.i18n!.localize('GURPS.resourceTracker.placeholder')}[${index}]`,
      value: tracker.value,
      state: tracker.currentThreshold?.state || '',
      color: tracker.currentThreshold?.color || null,
      pdf: tracker.pdf || '',
      alias: tracker.alias || '',
      min: tracker.min,
      max: tracker.max,
      thresholds: tracker.thresholds.map(threshold => ({
        comparison: threshold.comparison,
        operator: threshold.operator,
        value: threshold.value,
        state: threshold.state,
        color: threshold.color,
      })),
      descriptors: tracker.thresholdDescriptors || [],
    })
    index++
  }

  return preparedData
}
