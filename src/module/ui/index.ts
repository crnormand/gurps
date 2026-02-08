import type { GurpsModule } from '@types/gurps-module.ts'

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
