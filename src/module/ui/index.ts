import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { PoolValueElement } from './pool-value.js'
import { GurpsSidebar } from './sidebar.js'

function init() {
  console.log('GURPS | Initializing GURPS UI module.')
  Hooks.once('init', () => {
    CONFIG.ui.sidebar = GurpsSidebar

    window.customElements.define(PoolValueElement.tagName, PoolValueElement)
  })
}

export const UI: GurpsModule = {
  init,
}
