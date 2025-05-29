import { GurpsSidebar } from './sidebar.js'

export function init() {
  console.log('GURPS | Initializing GURPS UI Module')
  Hooks.once('init', () => {
    CONFIG.ui.sidebar = GurpsSidebar
  })
}
