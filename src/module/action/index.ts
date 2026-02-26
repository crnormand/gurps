import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { MeleeAttackModel } from './melee-attack.js'
import { RangedAttackModel } from './ranged-attack.js'
import { ActionType } from './types.ts'

/* ---------------------------------------- */

const ActionClasses = {
  [ActionType.MeleeAttack]: MeleeAttackModel,
  [ActionType.RangedAttack]: RangedAttackModel,
}

type AnyAction = InstanceType<ActionClass<ActionType>>
type Action<Type extends ActionType> = InstanceType<(typeof ActionClasses)[Type]>
type AnyActionClass = (typeof ActionClasses)[ActionType]
type ActionClass<Type extends ActionType> = (typeof ActionClasses)[Type]

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Action module.')
  // @ts-expect-error: Invalid type
  GURPS.CONFIG ||= {}
  // @ts-expect-error: Invalid type
  GURPS.CONFIG.PseudoDocument ||= {}

  GURPS.CONFIG.PseudoDocument.Action = {
    [ActionType.MeleeAttack]: {
      label: 'TYPES.Action.meleeAttack',
      documentClass: MeleeAttackModel,
    },
    [ActionType.RangedAttack]: {
      label: 'TYPES.Action.rangedAttack',
      documentClass: RangedAttackModel,
    },
  }
}

/* ---------------------------------------- */

export const ActionModule: GurpsModule = {
  init,
}

export * from './melee-attack.js'
export * from './ranged-attack.js'
export { ActionClasses, ActionType }
export type { Action, ActionClass, AnyAction, AnyActionClass }
