import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { GurpsRuler } from './ruler.js'

function init() {
  console.log('GURPS | Initializing GURPS Canvas Module')

  Hooks.once('init', () => {
    CONFIG.Canvas.rulerClass = GurpsRuler
  })
}

export const Canvas: GurpsModule = {
  init,
}
