import { GurpsModule } from 'module/gurps-module.js'

import { MeleeAttack } from './melee-attack.js'
import { RangedAttack } from './ranged-attack.js'

function init() {
  console.log('GURPS | Initializing GURPS Action module.')
  GURPS.CONFIG ||= {}
  GURPS.CONFIG.Action = {
    meleeAttack: {
      // TODO: localize
      label: 'Melee Attack',
      documentClass: MeleeAttack,
    },
    rangedAttack: {
      // TODO: localize
      label: 'Ranged Attack',
      documentClass: RangedAttack,
    },
  }
}

export const Action: GurpsModule = {
  init,
}

export * from './melee-attack.js'
export * from './ranged-attack.js'
