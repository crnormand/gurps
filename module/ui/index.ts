import { GurpsSidebar } from './sidebar.js'

export function init() {
  console.log('GURPS | Initializing GURPS UI module.')
  Hooks.once('init', () => {
    CONFIG.ui.sidebar = GurpsSidebar
  })
}

// @ts-expect-error
const _typecheck: GurpsModule = { init }
