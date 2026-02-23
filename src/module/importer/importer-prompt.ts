import { AnyObject } from 'fvtt-types/utils'

import { GcaImporter } from './gca-importer/importer.js'
import { GCA5 } from './gca-importer/schema.js'
import { GcsImporter } from './gcs-importer/importer.js'
import { GcsCharacter } from './gcs-importer/schema/character.js'
import { GcsEquipmentCollection } from './gcs-importer/schema/equipment.js'
import { GcsSkillCollection } from './gcs-importer/schema/skill.js'
import { GcsSpellCollection } from './gcs-importer/schema/spell.js'
import { GcsTraitCollection } from './gcs-importer/schema/trait.js'

async function actorImporterPrompt(actor?: Actor.OfType<'characterV2'>) {
  if (!game.i18n) throw Error('GURPS | game.i18n not available when trying to import GCS character!')

  const name = actor ? actor.name : game.i18n.localize('TYPES.Actor.characterV2')

  return new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n.format('GURPS.importer.actor.title', { name }),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/importer/import-prompt.hbs',
      {
        description: game.i18n.localize('GURPS.importer.actor.description'),
        fileTypes: ['.gcs', '.gca5'].join(','),
        note: game.i18n.format('GURPS.importer.actor.note', { name }),
        source: game.i18n.localize('GURPS.importer.actor.source'),
        warning: game.i18n.localize('GURPS.importer.actor.warning'),
      }
    ),
    buttons: [
      {
        action: 'import',
        label: game.i18n.localize('GURPS.importer.actor.button'),
        icon: 'fa-solid fa-file-import',
        default: true,
        callback: async (_1, button, _2) => {
          // @ts-expect-error types are idk
          const files = button.form?.elements.data.files

          if (!files || files.length === 0) {
            ui.notifications?.error(game.i18n!.localize('GURPS.importer.error.noFilesSelected'))

            return
          } else {
            // Measure how long importing takes
            const startTime = performance.now()

            const file = files[0]
            const text = await GURPS.readTextFromFile(file)

            const lastDotIndex = file.name.lastIndexOf('.')

            if (lastDotIndex < 0) {
              throw new Error('GURPS | Selected file has no extension.')
            }

            const extension = file.name.slice(lastDotIndex + 1)

            switch (extension) {
              case 'gcs': {
                let jsonObject: AnyObject = {}

                try {
                  jsonObject = JSON.parse(text)
                } catch {
                  console.error('GURPS | Failed to parse JSON from file.')

                  return
                }

                const char = GcsCharacter.fromImportData(jsonObject) as GcsCharacter
                const importedActor = await GcsImporter.importCharacter(char, actor)

                console.debug('Imported data:', importedActor)
                break
              }
              case 'gca5': {
                const xmlText = new DOMParser().parseFromString(text, 'application/xml')
                const gca5File = GCA5.fromXML(xmlText)
                const importedActor = await GcaImporter.importCharacter(gca5File.character[0], actor)

                console.debug('Imported data:', importedActor)
                break
              }

              default:
                throw new Error(`GURPS | Unrecognized file type for character import: ${extension}`)
            }

            console.debug(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

/* ---------------------------------------- */

async function itemImporterPrompt() {
  if (!game.i18n) throw Error('GURPS | game.i18n not available when trying to import GCS Compendium!')

  return new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n.localize('GURPS.importer.item.title'),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/importer/import-prompt.hbs',
      {
        description: game.i18n.localize('GURPS.importer.item.description'),
        fileTypes: ['.adj', '.skl', '.spl', '.eqp'].join(','),
        source: game.i18n.localize('GURPS.importer.item.source'),
      }
    ),
    buttons: [
      {
        action: 'import',
        label: game.i18n.localize('GURPS.importer.item.button'),
        icon: 'fa-solid fa-file-import',
        default: true,
        callback: async (_1, button, _2) => {
          // @ts-expect-error types are idk
          const files = button.form?.elements.data.files

          if (!files || files.length === 0) {
            ui.notifications?.error(game.i18n!.localize('GURPS.importer.error.noFilesSelected'))

            return
          } else {
            // Measure how long importing takes
            const startTime = performance.now()

            const file = files[0]
            const text = await GURPS.readTextFromFile(file)
            const lastDotIndex = file.name.lastIndexOf('.')

            if (lastDotIndex < 0) {
              throw new Error('GURPS | Selected file has no extension.')
            }

            const extension = file.name.slice(lastDotIndex + 1)
            const name = file.name.slice(0, lastDotIndex)

            let jsonObject: AnyObject = {}

            try {
              jsonObject = JSON.parse(text)
            } catch (error) {
              console.error('GURPS | Failed to parse JSON from file:', error)

              return
            }

            switch (extension) {
              case 'adq': {
                const collection = GcsTraitCollection.fromImportData({
                  ...jsonObject,
                  type: 'trait',
                  name,
                }) as GcsTraitCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'skl': {
                const collection = GcsSkillCollection.fromImportData({
                  ...jsonObject,
                  type: 'skill',
                  name,
                }) as GcsSkillCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'spl': {
                const collection = GcsSpellCollection.fromImportData({
                  ...jsonObject,
                  type: 'spell',
                  name,
                }) as GcsSpellCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'eqp': {
                const collection = GcsEquipmentCollection.fromImportData({
                  ...jsonObject,
                  type: 'equipment',
                  name,
                }) as GcsEquipmentCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }

              default:
                throw new Error(`GURPS | Unrecognized file type for compendium import: ${extension}`)
            }

            console.debug(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { actorImporterPrompt, itemImporterPrompt }
