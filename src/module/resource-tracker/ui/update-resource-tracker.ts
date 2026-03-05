import { TrackerInstance } from '../resource-tracker.js'
import { IResourceTracker } from '../types.js'

export async function updateResourceTracker(actor: Actor.Implementation, tracker: TrackerInstance): Promise<void> {
  const trackerData = JSON.parse(JSON.stringify(tracker)) as IResourceTracker

  interface TrackerEditorOptions {
    onUpdate: (editedTracker: IResourceTracker) => Promise<void>
  }

  const dialog = new GURPS.modules.ResourceTracker.TrackerEditorV2(trackerData, {
    onUpdate: async (editedTracker: IResourceTracker): Promise<void> => {
      await tracker.update(editedTracker as any)
      await actor.render()
    },
  } as TrackerEditorOptions)

  await dialog.render({ force: true })
}
