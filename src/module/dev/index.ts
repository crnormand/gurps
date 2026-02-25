import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { GGADebugger } from './debugger.js'
import { registerSettings } from './settings.js'

/* ---------------------------------------- */

interface DevModule extends GurpsModule {
  settings: typeof settings
}

function init() {
  console.log('GURPS | Initializing GURPS Dev module.')

  Hooks.on('init', () => {
    registerSettings()

    GGADebugger.init()
  })
}

/* ---------------------------------------- */

const settings = {
  get enableNonProductionDocumentTypes(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, 'dev.enableNonProductionDocumentTypes')
  },

  get showDebugInfo(): boolean {
    return game.settings!.get(GURPS.SYSTEM_NAME, 'dev.showDebugInfo')
  },
}

const Dev: DevModule = {
  init,
  settings,
}

export { Dev }
