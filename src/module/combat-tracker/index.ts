import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { addManeuverListeners } from './maneuver-menu.js'
import { renderCombatTracker } from './render-combat-tracker.js'

export const CombatTracker: GurpsModule = {
  init(): void {
    console.log('GURPS | Initializing GURPS Combat Tracker module.')

    Hooks.once('ready', () => {
      addManeuverListeners()

      Hooks.on('renderCombatTracker', async function (_app, element, _options, _context) {
        renderCombatTracker(_app, element, _options, _context)
      })
    })
  },
}
