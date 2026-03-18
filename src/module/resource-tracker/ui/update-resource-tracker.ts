import { TrackerInstance } from '../resource-tracker.js'
import { IResourceTracker } from '../types.js'

import { ResourceTrackerEditorV2 } from './resource-tracker-editor-v2.js'

export async function updateResourceTracker(actor: Actor.Implementation, tracker: TrackerInstance): Promise<void> {
  const trackerData = { ...tracker, currentValue: tracker.currentValue } as IResourceTracker

  interface TrackerEditorOptions {
    onUpdate: (editedTracker: IResourceTracker) => Promise<void>
  }

  const dialog = new ResourceTrackerEditorV2(trackerData, {
    onUpdate: async (editedTracker: IResourceTracker): Promise<void> => {
      await tracker.update(editedTracker as any)
    },
  } as TrackerEditorOptions)

  await dialog.render({ force: true })
}
