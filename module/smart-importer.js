import { UniversalFileHandler } from './file-handlers/universal-file-handler.js'
export class SmartImporter {
  static async getFileForActor(actor) {
    const file = this.actorToFileMap.get(actor)
    const template = await getTemplate('systems/gurps/templates/import-gcs-or-gca.hbs')
    console.log(template)
    return (
      file ??
      (await UniversalFileHandler.getFile({
        template,
        templateOptions: { name: actor.name },
        extensions: ['.xml', '.txt', '.gcs'],
      }))
    )
  }
  static setFileForActor(actor, file) {
    this.actorToFileMap.set(actor, file)
  }
}
SmartImporter.actorToFileMap = new Map()
