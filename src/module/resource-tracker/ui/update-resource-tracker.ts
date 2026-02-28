import { TrackerInstance } from '../resource-tracker.ts'

export async function updateResourceTracker(actor: Actor.Implementation, tracker: TrackerInstance): Promise<void> {
  const trackerData = JSON.parse(JSON.stringify(tracker)) as TrackerInstance

  interface TrackerEditorOptions {
    onUpdate: (editedTracker: TrackerInstance) => Promise<void>
  }

  const dialog = new GURPS.modules.ResourceTracker.TrackerEditorV2(trackerData, {
    onUpdate: async (editedTracker: TrackerInstance): Promise<void> => {
      await tracker.update(editedTracker as unknown as Record<string, unknown>)
      await actor.render()
    },
  } as TrackerEditorOptions)

  await dialog.render({ force: true })
}
