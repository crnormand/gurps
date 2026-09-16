import { ActionFuncContext } from '@module/otf/actionFuncs.js'
import { calculateMessageMode } from '@module/otf/dieroll.js'
import { RollConfirmationDialog } from '@module/otf/rollConfirmationDialog.js'
import { DamageAction, DerivedDamageAction } from '@module/otf/types.js'
import { FoundryUtils, MessageMode } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

import DamageChat from './damagechat.js'

export async function rollDamage(
  canRoll: any,
  token: Token | null,
  actor: Actor.Implementation | null,
  displayFormula: string,
  actionFormula: string,
  action: DamageAction | DerivedDamageAction,
  event: ActionFuncContext | null,
  overrideText: string | null,
  targets: string[]
): Promise<boolean> {
  if (!game.settings || !game.i18n || !game.users)
    throw new Error('GURPS | rollDamage: game settings or i18n or users not available.')

  const showRollDialog = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)

  const messageMode = calculateMessageMode(FoundryUtils.MessageMode, action.blindroll ?? false, event) as MessageMode

  if (showRollDialog && !canRoll.isSlam) {
    const response = await RollConfirmationDialog.wait({
      type: 'damage',
      messages: canRoll.messages,
      action,
      actor,
      token,
      displayFormula,
      messageMode,
    })

    if (response) {
      await DamageChat.create(
        (actor as Actor) || (game.user as User),
        actionFormula,
        action.damagetype,
        event,
        overrideText,
        targets,
        action.extdamagetype,
        action.hitlocation,
        action.blindroll
      )

      if (action.next) {
        return await GURPS.modules.Otf.performAction(action.next, actor, event, targets)
      }

      return true
    } else {
      await GURPS.ModifierBucket.clearTaggedModifiers()
      GURPS.stopActions = true

      return false
    }
  } else {
    await DamageChat.create(
      (actor as Actor) || (game.user as User),
      actionFormula,
      action.damagetype,
      event,
      overrideText,
      targets,
      action.extdamagetype,
      action.hitlocation,
      action.blindroll
    )

    if (action.next) {
      return await GURPS.modules.Otf.performAction(action.next, actor, event, targets)
    }

    return true
  }
}
