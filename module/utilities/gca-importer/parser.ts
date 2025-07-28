import { GCA5 } from './gca-schema.js'
import { GcaImporter } from './importer.js'

async function importGCA() {
  return new foundry.applications.api.DialogV2({
    window: {
      title: 'Import from GCA 5',
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/import-gcs-v1-data.hbs', {}),
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
            const xmlTest = new DOMParser().parseFromString(text, 'application/xml')
            const gca5File = GCA5.fromXML(xmlTest)
            await GcaImporter.importCharacter(gca5File.character[0])

            console.log(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { importGCA }
