import { GurpsModule } from 'module/gurps-module.js'

import { ActionType } from './base-action.ts'
import { MeleeAttackModel } from './melee-attack.js'
import { RangedAttackModel } from './ranged-attack.js'

const ActionClasses = {
  [ActionType.MeleeAttack]: MeleeAttackModel,
  [ActionType.RangedAttack]: RangedAttackModel,
}

type AnyAction = InstanceType<ActionClass<ActionType>>
type Action<Type extends ActionType> = InstanceType<(typeof ActionClasses)[Type]>
type AnyActionClass = (typeof ActionClasses)[ActionType]
type ActionClass<Type extends ActionType> = (typeof ActionClasses)[Type]

function init() {
  console.log('GURPS | Initializing GURPS Action module.')
  // @ts-expect-error: Invalid type
  GURPS.CONFIG ||= {}
  GURPS.CONFIG.Action = {
    meleeAttack: {
      // TODO: localize
      label: 'Melee Attack',
      documentClass: MeleeAttackModel,
    },
    rangedAttack: {
      // TODO: localize
      label: 'Ranged Attack',
      documentClass: RangedAttackModel,
    },
  }
}

export const ActionModule: GurpsModule = {
  init,
}

export * from './melee-attack.js'
export * from './ranged-attack.js'
export { ActionClasses }
export type { Action, ActionClass, AnyAction, AnyActionClass }
