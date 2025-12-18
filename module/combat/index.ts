import { GurpsModule } from 'module/gurps-module.js'
import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'
import { onTargetToken } from './hooks.js'

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant

    Hooks.on('targetToken', onTargetToken)
    Hooks.on('controlToken', onTargetToken)
  })
}

export const Combat: GurpsModule = {
  init,
}
