import { type TrackerInstance } from '@module/resource-tracker/resource-tracker.js'
import { getGame, isHTMLElement } from '@module/util/guards.js'
import { ThresholdDescriptor } from '@rules/injury/hit-points.js'

export function bindTrackerActions(html: HTMLElement, actor: Actor.Implementation): void {
  const entityType = 'Tracker'

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit${entityType}"]`)

  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid ?? ''
      const tracker = (await fromUuid(uuid)) as TrackerInstance | null

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: uuid }))

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
      const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid ?? ''
      const tracker = (await fromUuid(uuid)) as TrackerInstance | null

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: uuid }))

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
      const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid ?? ''
      const tracker = (await fromUuid(uuid)) as TrackerInstance | null

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: uuid }))

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
      const uuid = target.closest<HTMLElement>('[data-uuid]')?.dataset.uuid ?? ''
      const tracker = (await fromUuid(uuid)) as TrackerInstance | null

      if (!tracker) {
        ui.notifications?.warn(getGame().i18n.format('GURPS.resourceTracker.trackerNotFound', { key: uuid }))

        return
      }

      tracker.resetValue()
    })
  })
}

export type PreparedTrackerData = {
  id: string
  uuid: string | null
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
      uuid: tracker.uuid,
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
