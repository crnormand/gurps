import { CombatGURPS } from './combat.js'
import { CombatantGURPS } from './combatant.js'

export function init() {
  Hooks.once('init', () => {
    console.log('GURPS | Initializing GURPS Combat module.')
    CONFIG.Combat.documentClass = CombatGURPS
    CONFIG.Combatant.documentClass = CombatantGURPS
  })
}
