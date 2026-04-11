import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { BaseAction } from './base-action.js'
import { MeleeAttackModel } from './melee-attack.js'
import { RangedAttackModel } from './ranged-attack.js'
import { ActionType } from './types.js'

/* ---------------------------------------- */

export const ActionClasses = {
  [ActionType.MeleeAttack]: MeleeAttackModel,
  [ActionType.RangedAttack]: RangedAttackModel,
}

namespace Action {
  export type Type = ActionType

  export type Any = InstanceType<ConstructorOfType<ActionType>>
  export type OfType<Type extends ActionType> = InstanceType<(typeof ActionClasses)[Type]>
  export type AnyConstructor = (typeof ActionClasses)[ActionType]
  export type ConstructorOfType<Type extends ActionType> = (typeof ActionClasses)[Type]
}

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Action module.')
  GURPS.CONFIG.PseudoDocument.Types.Action = BaseAction

  GURPS.CONFIG.PseudoDocument.SubTypes.Action = {
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

interface ActionModule extends GurpsModule {
  models: typeof ActionClasses
}

export const ActionModule: ActionModule = {
  init,
  models: ActionClasses,
}

export * from './melee-attack.js'
export * from './ranged-attack.js'
export { ActionType, BaseAction, MeleeAttackModel, RangedAttackModel }
export type { Action }
