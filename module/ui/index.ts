import { GurpsModule } from 'module/gurps-module.js'

import { GurpsSidebar } from './sidebar.js'

function init() {
  console.log('GURPS | Initializing GURPS UI module.')
  Hooks.once('init', () => {
    CONFIG.ui.sidebar = GurpsSidebar
  })
}

export const UI: GurpsModule = {
  init,
}
