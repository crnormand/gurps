import { GurpsModule } from '@gurps-types/gurps-module.js'

import { GurpsCompendiumDirectory } from './compendium-directory.ts'

function init() {
  console.log('GURPS | Initializing GURPS Applications module.')
  Hooks.on('init', () => {
    CONFIG.ui.compendium = GurpsCompendiumDirectory
  })
}

export const Applications: GurpsModule = {
  init,
}
