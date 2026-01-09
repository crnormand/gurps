import { GurpsModule } from 'module/gurps-module.js'

import { MeleeAttackModel } from './melee-attack.js'
import { RangedAttackModel } from './ranged-attack.js'

function init() {
  console.log('GURPS | Initializing GURPS Action module.')
  // @ts-expect-error: Invalid type
  GURPS.CONFIG ||= {}
  GURPS.CONFIG.Action = {
    meleeAttack: {
      // TODO: localize
      label: 'Melee Attack',
      // @ts-expect-error: Type shows as invalid but is valid?
      documentClass: MeleeAttackModel,
    },
    rangedAttack: {
      // TODO: localize
      label: 'Ranged Attack',
      // @ts-expect-error: Type shows as invalid but is valid?
      documentClass: RangedAttackModel,
    },
  }
}

export const Action: GurpsModule = {
  init,
}

export * from './melee-attack.js'
export * from './ranged-attack.js'
