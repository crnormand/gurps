import { GcsImporter } from './importer.js'
import { GcsCharacter } from './schema/character.js'

async function importGCS(actor?: Actor.OfType<'characterV2'>) {
  return new foundry.applications.api.DialogV2({
    window: {
      title: 'Import from GCS 5.36',
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/gcs-importer/import-gcs-or-gca.hbs',
      {}
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
            ui.notifications?.error('No file selected for import.')
            return
          } else {
            // Measure how long importing takes
            const startTime = performance.now()

            const file = files[0]
            const text = await GURPS.readTextFromFile(file)
            const char = GcsCharacter.fromImportData(JSON.parse(text)) as GcsCharacter
            await GcsImporter.importCharacter(char, actor)

            console.log(actor)
            console.log(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { importGCS }
