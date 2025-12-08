import { GcsImporter } from './importer.js'
import { GcsCharacter } from './schema/character.js'

async function importGCS(actor?: Actor.OfType<'characterV2'>) {
  const defaultActorName = game.i18n!.localize('TYPES.Actor.characterV2')

  return new foundry.applications.api.DialogV2({
    window: {
      title: game.i18n!.format(`GURPS.importCharacterData`, { name: actor?.name || defaultActorName }),
    },
    position: { width: 400, height: 'auto' },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/gcs-importer/import-gcs-or-gca.hbs',
      {
        title: game.i18n!.localize('GURPS.importSelectFileTitleGCS'),
        source: game.i18n!.localize('GURPS.importSelectFileSource'),
        describeAction: game.i18n!.localize('GURPS.importSelectFileDescribeAction'),
        overwriteAction: new Handlebars.SafeString(
          game.i18n!.format('GURPS.importSelectFileOverwriteAction', {
            name: actor?.name || defaultActorName,
          })
        ),
        itemAction: new Handlebars.SafeString(
          game.i18n!.format('GURPS.importSelectFileItemAction', {
            equipType: game.i18n!.localize('GURPS.importTraitToFoundryItem'),
            equipColor: '#35713e',
          })
        ),
        note: game.i18n!.localize('GURPS.importSelectFileNote'),
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
            ui.notifications?.error(game.i18n!.localize('GURPS.importNoFilesSelected'))
            return
          } else {
            // Measure how long importing takes
            const startTime = performance.now()

            const file = files[0]
            const text = await GURPS.readTextFromFile(file)
            const char = GcsCharacter.fromImportData(JSON.parse(text)) as GcsCharacter
            const importedActor = await GcsImporter.importCharacter(char, actor)

            console.log(importedActor)
            console.log(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
          }
        },
      },
    ],
  }).render({ force: true })
}

export { importGCS }
