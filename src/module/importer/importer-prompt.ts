import { GcaImporter } from './gca-importer/importer.js'
import { GCA5 } from './gca-importer/schema.js'
import { GcsImporter } from './gcs-importer/importer.js'
import { GcsCharacter } from './gcs-importer/schema/character.js'
import { GcsEquipmentCollection } from './gcs-importer/schema/equipment.ts'
import { GcsSkillCollection } from './gcs-importer/schema/skill.ts'
import { GcsSpellCollection } from './gcs-importer/schema/spell.ts'
import { GcsTraitCollection } from './gcs-importer/schema/trait.ts'

async function actorImporterPrompt(actor?: Actor.OfType<'characterV2'>) {
  if (!game.i18n) throw Error('GURPS | game.i18n not available when trying to import GCS character!')

  const name = actor ? actor.name : game.i18n.localize('TYPES.Actor.characterV2')

  return new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n.format('GURPS.importer.prompt.title', { name }),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/importer/import-prompt.hbs',
      {
        description: game.i18n.localize('GURPS.importer.prompt.description'),
        source: game.i18n.localize('GURPS.importer.prompt.source'),
        note: game.i18n.format('GURPS.importer.prompt.note', {
          name,
        }),
        warning: game.i18n.localize('GURPS.importer.prompt.warning'),
      }
    ),
    buttons: [
      {
        action: 'import',
        label: 'Import',
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
            const extension = file.name.split('.')[1]

            switch (extension) {
              case 'gcs': {
                const char = GcsCharacter.fromImportData(JSON.parse(text)) as GcsCharacter
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
      title: game.i18n.localize('GURPS.importer.prompt.titleItem'),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/importer/import-prompt.hbs',
      {
        description: game.i18n.localize('GURPS.importer.prompt.description'),
        source: game.i18n.localize('GURPS.importer.prompt.source'),
      }
    ),
    buttons: [
      {
        action: 'import',
        label: 'Import',
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
            const extension = file.name.split('.')[1]

            switch (extension) {
              case 'adq': {
                const collection = GcsTraitCollection.fromImportData({
                  ...JSON.parse(text),
                  type: 'trait',
                  name: file.name.split('.')[0],
                }) as GcsTraitCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'skl': {
                const collection = GcsSkillCollection.fromImportData({
                  ...JSON.parse(text),
                  type: 'skill',
                  name: file.name.split('.')[0],
                }) as GcsSkillCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'spl': {
                const collection = GcsSpellCollection.fromImportData({
                  ...JSON.parse(text),
                  type: 'spell',
                  name: file.name.split('.')[0],
                }) as GcsSpellCollection
                const importedCompendium = await GcsImporter.importItemCompendium(collection)

                console.debug('Imported data:', importedCompendium)
                break
              }
              case 'eqp': {
                const collection = GcsEquipmentCollection.fromImportData({
                  ...JSON.parse(text),
                  type: 'trait',
                  name: file.name.split('.')[0],
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
