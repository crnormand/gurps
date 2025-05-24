import { GurpsSidebar } from './sidebar.js'

export function init() {
  Hooks.once('init', () => {
    CONFIG.ui.sidebar = GurpsSidebar
  })
}
