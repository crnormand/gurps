import { GurpsModule } from 'module/gurps-module.js'

import { registerRuler } from './ruler.js'

function init() {
  console.log('GURPS | Initializing GURPS Canvas Module')

  Hooks.once('init', () => {
    if (!game.release) return
    registerRuler()
  })
}

export const Canvas: GurpsModule = {
  init,
}
