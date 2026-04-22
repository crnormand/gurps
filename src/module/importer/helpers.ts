import { DataModel } from '@gurps-types/foundry/index.js'
import { ActionType } from '@module/action/types.js'
import {
  IResourceTrackerTemplate,
  ResourceTrackerModule,
  ResourceTrackerSchema,
} from '@module/resource-tracker/index.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'

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
      _id: id,
    }

    importer.output.additionalresources!.tracker![id] = trackerData
  })
}

/* ---------------------------------------- */

/**
 * If the affected actor was migrated from the pre-1.0.0 version of GGA, it likely holds
 * orphaned pseudo-documents which will be duplicated on first import. This prompts the user to delete those
 * pseudo-documents, which are identified by a specific flag set on them, in order to prevent duplicates.
 *
 */
export async function promptDeletionOfMigratedItems(actor?: Actor.Implementation): Promise<void> {
  if (!actor) return

  const holderItem = actor.system.holderItem

  if (!holderItem) return

  const melee = [...holderItem.system.actions.contents]
    .filter(doc => doc.flags.isMigratedItem && doc.isOfType(ActionType.MeleeAttack))
    .map(doc => {
      return { id: doc._id, name: `${doc._displayName} (${doc.mode})` }
    })

  const ranged = [...holderItem.system.actions.contents]
    .filter(doc => doc.flags.isMigratedItem && doc.isOfType(ActionType.RangedAttack))
    .map(doc => {
      return { id: doc._id, name: `${doc._displayName} (${doc.mode})` }
    })

  const conditionalMods = [...holderItem.system._conditionalmods]
    .filter(doc => doc.flags.isMigratedItem)
    .map(doc => {
      return { id: doc._id, name: `[${doc.modifier}] ${doc.situation}` }
    })

  const reactionMods = [...holderItem.system._reactions]
    .filter(doc => doc.flags.isMigratedItem)
    .map(doc => {
      return { id: doc._id, name: `[${doc.modifier}] ${doc.situation}` }
    })

  if ([...melee, ...ranged, ...conditionalMods, ...reactionMods].length === 0) return

  const content = await foundry.applications.handlebars.renderTemplate(
    systemPath('templates/importer/migrated-items-prompt.hbs'),
    {
      collections: [
        {
          title: 'TYPES.Action.meleeAttack',
          entries: melee,
        },
        {
          title: 'TYPES.Action.rangedAttack',
          entries: ranged,
        },
        {
          title: 'DOCUMENT.ConditionalModifier',
          entries: conditionalMods,
        },
        {
          title: 'DOCUMENT.ReactionModifier',
          entries: reactionMods,
        },
      ],
    }
  )

  const response = await foundry.applications.api.DialogV2.wait({
    window: {
      title: getGame().i18n!.localize('GURPS.importer.migratedItemsPrompt.title'),
      resizable: true,
    },
    position: {
      width: 450,
      height: 700,
    },
    content,
    buttons: [
      {
        action: 'confirmDeletions',
        icon: 'fa-solid fa-trash',
        label: 'GURPS.importer.migratedItemsPrompt.confirmDeletions',
        default: false,
        callback: (event, button, dialog) => {
          event.preventDefault()

          const checkboxes = Array.from(
            dialog.element.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]:checked')
          ).map(checkbox => checkbox.name)

          return {
            action: button.dataset.action,
            toDelete: checkboxes,
          }
        },
      },
      {
        action: 'cancel',
        icon: 'fa-solid fa-ban',
        label: 'GURPS.importer.migratedItemsPrompt.cancel',
        default: true,
        callback: (event, button) => {
          event.preventDefault()

          return {
            action: button.dataset.action,
            toDelete: [] as string[],
          }
        },
      },
    ],
    render: (_event, dialog) => {
      const html = dialog.element

      html.querySelector<HTMLFormElement>('form')?.classList.add('scrollable')

      const tables = html.querySelectorAll<HTMLTableElement>('table')

      for (const table of tables) {
        const checkboxes = table.querySelectorAll<HTMLInputElement>('td input[type="checkbox"]')
        const selectAllCheckbox = table.querySelector<HTMLInputElement>('th input[type="checkbox"]')

        selectAllCheckbox?.addEventListener('change', () => {
          checkboxes.forEach(checkbox => (checkbox.checked = selectAllCheckbox.checked))
        })
      }
    },
  })

  if (response && response.action === 'confirmDeletions') {
    const pseudoDocuments = [
      ...holderItem.system.actions.contents,
      ...holderItem.system._conditionalmods,
      ...holderItem.system._reactions,
    ]

    const docsToDelete = pseudoDocuments.filter(doc => response.toDelete.includes(doc._id))
    const docsToKeep = pseudoDocuments.filter(doc => !response.toDelete.includes(doc._id))

    const deleteUpdates = Object.fromEntries(docsToDelete.map(doc => [`${doc.fieldPath}.${doc._id}`, globalThis._del]))
    const keepUpdates = Object.fromEntries(
      docsToKeep.map(doc => [`${doc.fieldPath}.${doc._id}.flags.isMigratedItem`, globalThis._del])
    )

    await holderItem.update({ ...deleteUpdates, ...keepUpdates })
  }
}
