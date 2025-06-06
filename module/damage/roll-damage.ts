import * as Settings from '../../lib/miscellaneous-settings.js'
import { i18nFallback } from '../utilities/i18nFallback.js'
import DamageChat from './damagechat.js'

export async function rollDamage(
  canRoll: any,
  token: TokenDocument | null,
  actor: Actor | null,
  displayFormula: string,
  actionFormula: string,
  action: any,
  event: Event,
  overrideText: string,
  targets: any
): Promise<boolean> {
  if (!game.settings || !game.i18n || !game.users)
    throw new Error('GURPS | rollDamage: game settings or i18n or users not available.')

  const showRollDialog = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)
  if (showRollDialog && !canRoll.isSlam) {
    // Get Actor Info
    const gmUser = game.users.find((it: User) => it.isGM && it.active)
    const tokenImg = token?.texture?.src || actor?.img || gmUser?.avatar
    const isVideo = tokenImg?.includes('webm') || tokenImg?.includes('mp4')
    const tokenName = token?.name || actor?.name || gmUser?.name
    const damageRoll = displayFormula
    const damageType = GURPS.DamageTables.translate(action.damagetype)
    const damageTypeLabel = i18nFallback(
      `GURPS.damageTypes.${GURPS.DamageTables.woundModifiers[damageType]?.label}`,
      damageType
    )
    const damageTypeIcon = GURPS.DamageTables.woundModifiers[damageType]?.icon || '<i class="fas fa-dice-d6"></i>'
    const damageTypeColor = GURPS.DamageTables.woundModifiers[damageType]?.color || '#772e21'
    const targetRoll = action.orig
    const bucketTotal = GURPS.ModifierBucket.currentSum()
    const bucketRoll = bucketTotal !== 0 ? `(${bucketTotal > 0 ? '+' : ''}${bucketTotal})` : ''
    const bucketRollColor = bucketTotal > 0 ? 'darkgreen' : bucketTotal < 0 ? 'darkred' : '#a8a8a8'
    const isBlindRoll = action.blindroll
    const useMinDamage = displayFormula.includes('!') && !displayFormula.startsWith('!')
    // Armor divisor can be (0.5) or (2) - need to regex to get the number
    const armorDivisorRegex = /\((\d*\.?\d+)\)/
    const armorDivisorNumber = action.extdamagetype?.match(armorDivisorRegex)?.[1]
    // Multiplier damage is x2, X3 or *4 - need to regex to get the number
    const multiplierRegex = /(?<=[xX*])\d+(\.\d+)?/
    const multiplierNumber = displayFormula.match(multiplierRegex)?.[0]
    // Simple formula is dice+add, examples: 1d, 2d+3, 1d-1
    const simpleFormula = displayFormula.match(/\d+d[+-]?\d*/)?.[0]
    const originalFormula = action.formula.match(/\d+d[+-]?\d*/)?.[0]
    const damageCost = action.costs?.split(' ').pop() || ''
    const otfDamageText = !!action.overridetxt && action.overridetxt !== action.formula ? action.overridetxt : ''
    const usingDiceAdd = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS)

    // Before open a new dialog, we need to make sure all other dialogs are closed, because bucket must be reset
    // before we start a new roll.

    if ($(document).find('.dialog-button.cancel').length > 0) {
      // Wait for the dialog to close.
      await new Promise(resolve => setTimeout(resolve, 500))
      // If there still is a cancel button, click it.
      for (const button of $(document).find('.dialog-button.cancel')) {
        console.log('clicking cancel button')
        button.click()
      }
    }

    const response = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.localize('GURPS.confirmRoll'),
        resizable: true,
      },
      position: {
        height: 'auto',
      },
      content: await renderTemplate('systems/gurps/templates/confirmation-damage-roll.hbs', {
        tokenImg,
        tokenName,
        damageRoll: simpleFormula || damageRoll,
        damageType,
        targetRoll,
        bucketRoll,
        messages: canRoll.targetMessage ? [canRoll.targetMessage] : [],
        useMinDamage,
        armorDivisorNumber,
        multiplierNumber,
        damageTypeLabel,
        damageTypeIcon,
        damageTypeColor,
        simpleFormula,
        bucketRollColor,
        originalFormula,
        damageCost,
        isVideo,
        otfDamageText,
        usingDiceAdd,
      }),
      buttons: [
        {
          action: 'roll',
          icon: isBlindRoll ? 'fas fa-eye-slash' : 'fas fa-dice',
          label: isBlindRoll ? 'GURPS.blindRoll' : 'GURPS.roll',
          default: true,
        },
        {
          action: 'cancel',
          icon: 'fas fa-times',
          label: 'GURPS.cancel',
        },
      ],
    })

    if (response === 'roll') {
      await DamageChat.create(
        actor || game.user,
        actionFormula,
        action.damagetype,
        event,
        overrideText,
        targets,
        action.extdamagetype,
        action.hitlocation
      )
      if (action.next) {
        return await GURPS.performAction(action.next, actor, event, targets)
      }
      return true
    } else {
      await GURPS.ModifierBucket.clear()
      GURPS.stopActions = true
      return false
    }
  } else {
    await DamageChat.create(
      actor || game.user,
      actionFormula,
      action.damagetype,
      event,
      overrideText,
      targets,
      action.extdamagetype,
      action.hitlocation
    )
    if (action.next) {
      return await GURPS.performAction(action.next, actor, event, targets)
    }
    return true
  }
}
