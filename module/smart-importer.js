import { UniversalFileHandler } from './file-handlers/universal-file-handler.js'
import * as Settings from '../lib/miscellaneous-settings.js'

export class SmartImporter {
  static async getFileForActor(actor) {
    const file = this.actorToFileMap.get(actor)
    const template = await getTemplate('systems/gurps/templates/import-gcs-or-gca.hbs')
    console.log(template)
    return (
      file ??
      (await UniversalFileHandler.getFile({
        template,
        templateOptions: this.getTemplateOptions(actor),
        extensions: ['.xml', '.txt', '.gcs'],
      }))
    )
  }
  static setFileForActor(actor, file) {
    this.actorToFileMap.set(actor, file)
  }
  static getTemplateOptions(actor) {
    const { name } = actor
    const useFoundryItems = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_FOUNDRY_ITEMS)
    const equipType = useFoundryItems
      ? game.i18n.localize('GURPS.importTraitToFoundryItem')
      : game.i18n.localize('GURPS.importTraitToClassicData')
    const equipColor = useFoundryItems ? '#35713e' : '#337bb7'
    return {
      title: game.i18n.localize('GURPS.importSelectFileTitle'),
      source: game.i18n.localize('GURPS.importSelectFileSource'),
      describeAction: game.i18n.localize('GURPS.importSelectFileDescribeAction'),
      overwriteAction: new Handlebars.SafeString(game.i18n.format('GURPS.importSelectFileOverwriteAction', { name })),
      itemAction: new Handlebars.SafeString(
        game.i18n.format('GURPS.importSelectFileItemAction', {
          equipType: equipType,
          equipColor: equipColor,
        })
      ),
      note: game.i18n.localize('GURPS.importSelectFileNote'),
    }
  }
}
SmartImporter.actorToFileMap = new Map()
