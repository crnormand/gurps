import { GurpsModule } from 'module/gurps-module.js'

import { GurpsRuler } from './ruler.ts'

function init() {
  console.log('GURPS | Initializing GURPS Canvas Module')

  Hooks.once('init', () => {
    CONFIG.Canvas.rulerClass = GurpsRuler
  })
}

export const Canvas: GurpsModule = {
  init,
}
