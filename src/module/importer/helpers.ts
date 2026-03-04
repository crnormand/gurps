import { DataModel } from '@gurps-types/foundry/index.js'
import {
  IResourceTrackerTemplate,
  ResourceTrackerModule,
  ResourceTrackerSchema,
} from '@module/resource-tracker/index.js'

type TypedItemCreateData<SubType extends Item.SubType> = Item.CreateData<SubType> & {
  // @ts-expect-error: the type system doesn't like this because it doesn't extend some empty object but it does in fact work.
  system: DataModel.CreateData<DataModel.SchemaOf<Item.SystemOfType<SubType>>>
}

/* ---------------------------------------- */

export function createDataIsOfType<SubType extends Item.SubType>(
  data: Item.CreateData,
  ...types: SubType[]
): data is TypedItemCreateData<SubType>

export function createDataIsOfType(data: Item.CreateData, ...types: string[]): boolean {
  return types.includes(data.type as Item.SubType)
}

export function createStandardTrackers(importer: { output: any; actor?: any }) {
  importer.output.additionalresources ||= {}
  importer.output.additionalresources.tracker ||= {}

  const templates: IResourceTrackerTemplate[] = importer.actor
    ? ResourceTrackerModule.getMissingRequiredTemplates(
        importer.actor.system.additionalresources?.tracker.contents ?? []
      )
    : Object.values(ResourceTrackerModule.getAllTemplatesMap()).filter(template => template.autoapply)

  templates.forEach(template => {
    const id = foundry.utils.randomID()

    const trackerData: DataModel.CreateData<ResourceTrackerSchema> = {
      ...template.tracker,
      initialValue: template.initialValue,
      _id: id,
    }

    importer.output.additionalresources!.tracker![id] = trackerData
  })
}
