import { GurpsModule } from 'module/gurps-module.js'
import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'
import { isUsingOnTarget, registerCombatSettings } from './settings.js'

export interface GurpsCombatModule extends GurpsModule {
  isUsingOnTarget: () => boolean
}

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
    registerCombatSettings()
  })
}

export const Combat: GurpsCombatModule = {
  init,
  isUsingOnTarget,
}
