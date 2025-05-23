import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'

export function init() {
  Hooks.once('init', () => {
    console.log('GURPS | Initializing GURPS Combat module.')
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
  })
}
