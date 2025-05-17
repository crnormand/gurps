import { RulerGURPSv12 } from './ruler-12.js'
import { RulerGURPS } from './ruler.js'

export function init() {
  Hooks.once('init', () => {
    console.log('GURPS | Initializing GURPS Canvas Module')

    if (!game.release) return
    if (game.release?.generation >= 13) {
      CONFIG.Canvas.rulerClass = RulerGURPS
    } else {
      CONFIG.Canvas.rulerClass = RulerGURPSv12
    }
  })
}
