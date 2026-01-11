import { CharacterModel } from '../actor/data/character.js'
import { GurpsModule } from '../gurps-module.js'
import { importerPrompt } from './importer-prompt.js'
import { migrate } from './migrate.js'
import { initializeGameSettings } from './settings.js'
import {
  AUTOMATICALLY_SET_IGNORE_QTY,
  DISPLAY_PRESERVE_QTY_FLAG,
  IMPORT_EXTENDED_VALUES_GCS,
  IMPORT_FILE_ENCODING,
  ONLY_TRUSTED_IMPORT,
  OVERWRITE_BODYPLAN,
  OVERWRITE_HP_FP,
  OVERWRITE_NAME,
  OVERWRITE_PORTRAITS,
  USE_BROWSER_IMPORTER,
} from './types.js'

interface ImporterModule extends GurpsModule {
  importerPrompt: typeof importerPrompt
}

function init() {
  console.log('GURPS | Initializing GURPS Importer module.')

  Hooks.on('init', () => {
    CONFIG.Actor.dataModels.characterV2 = CharacterModel

    initializeGameSettings()
  })
}

const Importer: ImporterModule = {
  init,
  migrate,
  importerPrompt,
}

/**
 * Convenience accessors for GCS Importer settings.
 *
 * These are separate from the Module because they may be used with other importers.
 */
const ImportSettings = {
  get displayPreserveQuantity(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, DISPLAY_PRESERVE_QTY_FLAG)
  },
  get fileEncoding(): 'Latin1' | 'UTF8' {
    return game.settings!.get(GURPS.SYSTEM_NAME, IMPORT_FILE_ENCODING) as 'Latin1' | 'UTF8'
  },
  get ignoreQuantityOnImport(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, AUTOMATICALLY_SET_IGNORE_QTY)
  },
  get importExtendedValues(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, IMPORT_EXTENDED_VALUES_GCS)
  },
  get onlyTrustedUsersCanImport(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, ONLY_TRUSTED_IMPORT)
  },
  get overwriteBodyPlan(): 'keep' | 'overwrite' | 'ask' {
    return game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_BODYPLAN) as 'keep' | 'overwrite' | 'ask'
  },
  get overwriteHpAndFp(): 'keep' | 'overwrite' | 'ask' {
    return game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP) as 'keep' | 'overwrite' | 'ask'
  },
  get overwriteName(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_NAME)
  },
  get overwritePortrait(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, OVERWRITE_PORTRAITS)
  },
  get useSmartImporter(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, USE_BROWSER_IMPORTER)
  },
}

export { Importer, ImportSettings }
