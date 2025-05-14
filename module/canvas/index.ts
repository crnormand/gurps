import { RulerGURPS } from './ruler.js'

export function init() {
  Hooks.once('init', () => {
    console.log('GURPS | Initializing GURPS Canvas Module')

    // @ts-expect-error: types have not yet caught up
    CONFIG.Canvas.rulerClass = RulerGURPS
  })
}
