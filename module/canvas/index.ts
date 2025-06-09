import { GurpsModule } from 'module/gurps-module.js'
import { GurpsRulerV12 } from './ruler-12.js'
import { GurpsRuler } from './ruler.js'

function init() {
  console.log('GURPS | Initializing GURPS Canvas Module')

  Hooks.once('init', () => {
    if (!game.release) return
    if (game.release?.generation >= 13) {
      CONFIG.Canvas.rulerClass = GurpsRuler
    } else {
      CONFIG.Canvas.rulerClass = GurpsRulerV12
    }
  })
}

export const Canvas: GurpsModule = {
  init,
}
