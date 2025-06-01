import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'

export function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
  })
}

// @ts-expect-error
const _typecheck: GurpsModule = { init }
