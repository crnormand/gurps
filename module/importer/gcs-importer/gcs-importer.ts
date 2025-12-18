import { GcsImporter } from './importer.js'
import { GcsCharacter } from './schema/character.js'

async function importGCS(actor?: Actor.OfType<'characterV2'>) {
  if (!game.i18n) throw Error('GURPS | game.i18n not available when trying to import GCS character!')

  const name = actor ? actor.name : game.i18n.localize('TYPES.Actor.characterV2')

  return new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n.format('GURPS.importer.prompt.title', { name }),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/gcs-importer/import-gcs5.hbs',
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
            const char = GcsCharacter.fromImportData(JSON.parse(text)) as GcsCharacter
            const importedActor = await GcsImporter.importCharacter(char, actor)

            console.debug('Imported data:', importedActor)
            console.debug(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { importGCS }
