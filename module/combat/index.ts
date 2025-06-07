import { GurpsModule } from 'module/gurps-module.js'
import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
  })
}

export const Combat: GurpsModule = {
  init,
}
