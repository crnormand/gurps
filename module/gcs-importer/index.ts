import { CharacterModel } from '../actor/data/character.js'
import { GurpsModule } from '../gurps-module.js'
import { importGCS } from './gcs-importer.js'

interface GcsImportModule extends GurpsModule {}

function init() {
  console.log('GURPS | Initializing GURPS GCSImport module.')

  Hooks.on('init', () => {
    CONFIG.Actor.dataModels.characterV2 = CharacterModel
  })

  Hooks.on('ready', () => {
    GURPS.importGCS = importGCS
  })
}

export const GcsImport: GcsImportModule = {
  init,
}
