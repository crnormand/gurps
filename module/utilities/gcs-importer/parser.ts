import { GcsCharacter } from './schema/character.js'

async function importGCS() {
  return new foundry.applications.api.DialogV2({
    window: {
      title: 'Import tet XML',
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
            const file = files[0]
            const text = await GURPS.readTextFromFile(file)
            const char = GcsCharacter.fromImportData(JSON.parse(text))
            console.log(char)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { importGCS }
