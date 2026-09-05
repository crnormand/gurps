import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { GurpsRegion } from './region.js'
import { GurpsRuler } from './ruler.js'
import { registerSettings } from './settings.js'

function init() {
  console.log('GURPS | Initializing GURPS Canvas Module')

  Hooks.once('init', () => {
    registerSettings()

    CONFIG.Canvas.rulerClass = GurpsRuler
    CONFIG.Region.objectClass = GurpsRegion
  })
}

export const Canvas: GurpsModule = {
  init,
}
