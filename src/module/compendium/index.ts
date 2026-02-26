import { GurpsModule } from '@gurps-types/gurps-module.js'

import { GurpsCompendiumDirectory } from './compendium-directory.js'

function init() {
  console.log('GURPS | Initializing GURPS Applications module.')
  Hooks.on('init', () => {
    CONFIG.ui.compendium = GurpsCompendiumDirectory
  })
}

export const Compendium: GurpsModule = {
  init,
}
