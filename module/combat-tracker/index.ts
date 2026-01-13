import { GurpsModule } from '../gurps-module.ts'
import { addManeuverListeners } from './maneuver-menu.js'
import { renderCombatTracker } from './render-combat-tracker.ts'

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
