import { CharacterModel } from '../actor/data/character.js'
import { GurpsModule } from '../gurps-module.js'
import { importGCS } from './gcs-importer.js'
import initializeGameSettings from './settings.js'
import {
  AUTOMATICALLY_SET_IGNORE_QTY,
  DISPLAY_PRESERVE_QTY_FLAG,
  IMPORT_EXTENDED_VALUES_GCS,
  ONLY_TRUSTED_IMPORT,
  OVERWRITE_BODYPLAN,
  OVERWRITE_HP_FP,
  OVERWRITE_NAME,
  OVERWRITE_PORTRAITS,
  USE_BROWSER_IMPORTER,
} from './types.js'

interface GcsImportModule extends GurpsModule {}

function init() {
  console.log('GURPS | Initializing GURPS GCSImport module.')

  Hooks.on('init', () => {
    CONFIG.Actor.dataModels.characterV2 = CharacterModel

    initializeGameSettings()
  })

  Hooks.on('ready', () => {
    GURPS.importGCS = importGCS
  })
}

const GcsImport: GcsImportModule = {
  init,
  migrate: async () => {
    game.settings!.storage.get('world')!.contents.filter((it: Setting) => it.key.startsWith('gurps.'))
  },
}

/**
 * Convenience accessors for GCS Importer settings.
 *
 * These are separate from the Module because they may be used with other importers.
 */
const ImportSettings = {
  displayPreserveQuantity: () => game.settings!.get(GURPS.SYSTEM_NAME, DISPLAY_PRESERVE_QTY_FLAG),
  ignoreQuantityOnImport: () => game.settings!.get(GURPS.SYSTEM_NAME, AUTOMATICALLY_SET_IGNORE_QTY),
  importExtendedValues: () => game.settings!.get(GURPS.SYSTEM_NAME, IMPORT_EXTENDED_VALUES_GCS),
  onlyTrustedUsersCanImport: () => game.settings!.get(GURPS.SYSTEM_NAME, ONLY_TRUSTED_IMPORT),
  overwriteBodyPlan: () => game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_BODYPLAN),
  overwriteHpAndFp: () => game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP),
  overwriteName: () => game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_NAME),
  overwritePortrait: () => game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_PORTRAITS),
  useSmartImporter: () => game.settings!.get(GURPS.SYSTEM_NAME, USE_BROWSER_IMPORTER),
}

export { GcsImport, ImportSettings }
