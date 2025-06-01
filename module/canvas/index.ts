import { GurpsModule } from 'module/types.js'
import { GurpsRulerV12 } from './ruler-12.js'
import { GurpsRuler } from './ruler.js'

export function init() {
  Hooks.once('init', () => {
    console.log('GURPS | Initializing GURPS Canvas Module')

    if (!game.release) return
    if (game.release?.generation >= 13) {
      CONFIG.Canvas.rulerClass = GurpsRuler
    } else {
      CONFIG.Canvas.rulerClass = GurpsRulerV12
    }
  })
}

// @ts-expect-error
const _typecheck: GurpsModule = { init }
