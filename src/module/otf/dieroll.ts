import { CanRollResult } from '@module/actor/types.js'
import { GurpsRoll } from '@module/modifier-bucket/bucket-app.js'
import { OtfActionType, OtfRollAction } from '@module/otf/types.js'
import { FoundryUtils, MessageMode } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { getTokenForActor } from '@module/util/token.js'
import { MissileWeaponAttacks } from '@rules/combat/ranged/missile-weapon-attacks.js'

import { TokenActions } from '../token-actions.js'

import { ActionFuncContext } from './actionFuncs.js'
import { applyModifierDescription } from './description-utilities.js'
import { RollConfirmationDialog } from './rollConfirmationDialog.js'

const KeyboardManager = foundry.helpers.interaction.KeyboardManager

export function setLastTargetedRoll(
  chatdata: any,
  actorid?: string | null,
  tokenid?: string | null,
  updateOtherClients = false
) {
  const tmp = { ...chatdata, actorid, tokenid }

  if (actorid) GURPS.lastTargetedRolls[actorid] = tmp
  if (tokenid) GURPS.lastTargetedRolls[tokenid] = tmp
  GURPS.lastTargetedRoll = tmp // keep the local copy
  // Interesting fields: GURPS.lastTargetedRoll.margin .isCritSuccess .IsCritFailure .thing

  if (updateOtherClients)
    game.socket?.emit('system.gurps', {
      type: 'setLastTargetedRoll',
      chatdata: tmp,
      actorid: actorid,
      tokenid: tokenid,
    })
}

export const rollData = (target: number) => {
  let targetColor, rollChance

  if (target < 6) {
    targetColor = '#b30000'
    rollChance = game.i18n?.localize('GURPS.veryHardRoll') ?? ''
  } else if (target < 11) {
    targetColor = '#cc6600'
    rollChance = game.i18n?.localize('GURPS.hardRoll') ?? ''
  } else if (target < 14) {
    targetColor = '#fdfdbd'
    rollChance = game.i18n?.localize('GURPS.fairRoll') ?? ''
  } else if (target < 17) {
    targetColor = '#5cbd58'
    rollChance = game.i18n?.localize('GURPS.easyRoll') ?? ''
  } else {
    targetColor = '#0a8d0a'
    rollChance = game.i18n?.localize('GURPS.veryEasyRoll') ?? ''
  }

  return { targetColor, rollChance }
}

/**
 * Recalculate the formula based on Modifier Bucket total.
 *
 * Formula examples: 2d+2, 1d-1, 3d6, 1d-2. (Must also handle literal damage, such as '13').
 * Can use the optional rule (B269) to round damage: +7 points = +2d and +4 points = +1d
 *
 * Examples:
 * * with armor divisor: 2d+2 (2)
 * * with damage type: 2d+2 cut
 * * with cost formula: 2d+2 (0.5) cut *Costs 1FP
 * * with armor divisor and damage type: 2d+2(2) cut
 * * with multiplier: 2d*2
 * * with minimum damage: 2d+2!
 * * Everything: 4d+2! (2) cut *Costs 1FP
 *
 * @param {string} formula
 * @param {boolean} addDamageType
 * @returns {string}
 */
export const addBucketToDamage = (formula: string, addDamageType = true) => {
  let dice = undefined
  let value = undefined

  if (formula.match(/^(?<dice>\d+)d/)) {
    dice = parseInt(formula.match(/^(?<dice>\d+)d/)?.groups?.dice ?? '')
  } else if (formula.match(/^(?<number>\d+)/)) {
    value = parseInt(formula.match(/^(?<number>\d+)/)?.groups?.number ?? '')
  }

  const add = parseInt(formula.match(/([+-]\d+)/)?.[1] ?? '0')
  const damageType = formula.match(/\s(\w+)/)?.[1] ?? ''

  const armorDivisor = formula.match(/(?<=\()\S+(?=\))/)?.[0]
  const hasMinDamage = formula.includes('!')
  const multiplier = formula.match(/(?<=[xX*])\d+(\.\d+)?/)?.[0] || ''
  const costFormula = formula.match(/(?<=\*)\D.+/)?.[0] || ''

  const bucketMod = GURPS.ModifierBucket.currentSum()
  let newAdd = add + bucketMod

  if (!dice && value) {
    return `${value + newAdd} ${addDamageType ? damageType : ''}`.trim()
  }

  if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS) && dice) {
    while (newAdd >= 7) {
      newAdd -= 7
      dice += 2
    }

    while (newAdd >= 4) {
      newAdd -= 4
      dice += 1
    }
  }

  const plus = newAdd > 0 ? '+' : ''
  const addText = newAdd !== 0 ? newAdd : ''
  const minDamageText = hasMinDamage ? '! ' : ''
  const armorDivisorText = armorDivisor ? `(${armorDivisor})` : ''
  const damageTypeText = addDamageType ? ` ${damageType}` : ''
  const costFormulaText = costFormula ? ` *${costFormula}` : ''
  const multiplierText = multiplier ? `*${multiplier}` : ''
  const newDice =
    `${dice}d${plus}${addText}${multiplierText}${minDamageText}${armorDivisorText}${damageTypeText}${costFormulaText}`.trim()

  console.debug(`addBucketToDamage: ${formula} => ${newDice}`)

  return newDice
}

export function calculateMessageMode(baseMode: MessageMode, blindOverride: boolean, event?: ActionFuncContext | null) {
  //apply modifier Keys from the event and current Modifier key, so that they can be pressed when the OTF is clicked or when the roll confirmation dialog is confirmed
  const ctrlKey =
    (event?.ctrlKey ?? false) ||
    // @ts-expect-error - Foundry VTT API not fully typed
    (game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL) ?? false) ||
    // On macOS, allow the Option key as an additional blind-roll shortcut without removing the existing Ctrl/Command shortcut.
    (navigator.platform.includes('Mac') &&
      (event?.altKey ||
        // @ts-expect-error - Foundry VTT API not fully typed
        game.keyboard.isModifierActive(KeyboardManager?.MODIFIER_KEYS.ALT ?? false)))

  const shiftKey =
    (event?.shiftKey ?? false) ||
    // @ts-expect-error - Foundry VTT API not fully typed
    (game.keyboard?.isModifierActive(KeyboardManager?.MODIFIER_KEYS.SHIFT) ?? false)

  if (blindOverride) return MessageMode.Blind
  if (ctrlKey && game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_CTRL_KEY)) return MessageMode.Blind
  if (shiftKey && game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_SHIFT_CLICK_BLIND) && !game.user?.isGM)
    return MessageMode.Blind
  if (shiftKey) return MessageMode.Self

  return baseMode
}

export async function doRoll({
  actor,
  formula = '3d6',
  targetmods = [],
  prefix = '',
  thing = '',
  chatthing = '',
  origtarget = -1,
  optionalArgs = {},
  fromUser = game.user,
  action,
}: {
  actor: Actor.Implementation | null
  formula?: string
  targetmods?: Modifier[]
  prefix?: string
  thing?: string
  chatthing?: string
  origtarget?: number
  optionalArgs?: {
    obj?: any
    blind?: boolean
    event?: ActionFuncContext | null
    followon?: string
    text?: string
    shots?: number
  }
  fromUser?: User | null
  action: OtfRollAction
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)

  const taggedSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)

  let token

  if (actor instanceof Actor) {
    const actorTokens =
      canvas?.tokens?.placeables.filter(token => {
        if (token.actor) return token.actor.id === actor.id
        ui.notifications?.warn(`Token is not linked to an actor [${token.id}]`)

        return false
      }) || []

    if (actorTokens.length === 1) {
      token = actorTokens[0]
    } else {
      token = getTokenForActor(actor)
    }
  }

  const result: CanRollResult =
    actor && action
      ? await actor.canRoll(action, token ?? null, chatthing, optionalArgs.obj)
      : { canRoll: true, hasActions: true, isSlam: false, isCombatant: false }

  const messages = Object.keys(result)
    // @ts-expect-error CanRollResult needs refactoring
    .filter(key => key.toLowerCase().includes('message') && !!result[key])
    // @ts-expect-error CanRollResult needs refactoring
    .map(key => result[key])

  if (!result.canRoll) {
    for (const message of messages) {
      ui.notifications?.warn(message)
    }

    return false
  }

  if (actor instanceof Actor && taggedSettings?.autoAdd) {
    // We need to clear all tagged modifiers from the bucket when user starts
    // a new targeted roll (for the same actor or another)
    await GURPS.ModifierBucket.clearTaggedModifiers()

    for (const mod of targetmods || []) {
      GURPS.ModifierBucket.addModifier(mod.mod, mod.desc || 'from action')
    }

    targetmods = []
    await actor.addTaggedRollModifiers(chatthing, optionalArgs)
  }

  const messageMode = calculateMessageMode(
    FoundryUtils.MessageMode,
    !!optionalArgs.blind || !!optionalArgs.event?.blind,
    optionalArgs.event
  )

  const showRollDialog = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)

  if (showRollDialog && actor instanceof Actor) {
    // Get Target Info
    const targetData = actor.findUsingAction(action, chatthing, formula, thing)
    const itemId = targetData.fromItem || targetData.itemId
    const item = actor.items.get(itemId ?? '')

    const rollApproved = await RollConfirmationDialog.wait({
      type: 'roll',
      messages,
      action,
      actor,
      token,
      item,
      origTarget: origtarget,
      formula,
      canRollResult: result,
      name: targetData.name,
      obj: optionalArgs.obj,
      messageMode,
    })

    if (rollApproved) {
      GURPS.stopActions = false

      return await _doRoll({
        actor,
        formula,
        targetmods,
        prefix,
        thing,
        chatthing,
        origtarget,
        optionalArgs,
        fromUser,
        action,
      })
    } else {
      await GURPS.ModifierBucket.clearTaggedModifiers()
      GURPS.stopActions = true

      return false
    }
  } else {
    return await _doRoll({
      actor,
      formula,
      targetmods,
      prefix,
      thing,
      chatthing,
      origtarget,
      optionalArgs,
      fromUser,
      action,
    })
  }
}

type RollChatData = {
  prefix: string
  chatthing: string
  thing: string
  origtarget: number
  fromUser?: string | null
  targetmods: Modifier[]
  showPlus?: boolean
  rtotal?: number
  loaded?: boolean
  rolls?: string
  modifier?: number
  finaltarget?: number
  isCritSuccess?: boolean
  isCritFailure?: boolean
  margin?: number
  failure?: boolean
  seventeen?: boolean
  isDraggable?: boolean
  otf?: string
  followon?: string
  rof?: string
  rcl?: string
  rofrcl?: number
  optlabel?: string
  multiples: { rtotal: number; loaded: boolean; rolls: string }[]
  isBlind: boolean
}

/*
  This is the BIG method that does the roll and prepares the chat message.
  unfortunately, it has a lot fo hard coded junk in it.
  */
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn',
// target=skill level or -1=damage roll
async function _doRoll({
  actor,
  formula,
  targetmods,
  prefix,
  thing,
  chatthing,
  origtarget,
  optionalArgs,
  fromUser,
  action,
}: {
  actor: Actor.Implementation | null
  formula: string
  targetmods: Modifier[]
  prefix: string
  thing: string
  chatthing: string
  origtarget: number
  optionalArgs: {
    obj?: any
    blind?: boolean
    event?: ActionFuncContext | null
    followon?: string
    text?: string
    shots?: number
  }
  fromUser?: User | null
  action: OtfRollAction
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  const isTargeted = origtarget > 0 // Roll "against" something (true), or just a roll (false)
  let failure = false

  // Let's collect up the modifiers, they are used differently depending on the type of roll
  let modifier = 0
  let maxtarget = null // If not null, then the target cannot be any higher than this.
  const usingRapidStrike = GURPS.ModifierBucket.modifierStack.usingRapidStrike

  targetmods = await GURPS.ModifierBucket.applyMods(targetmods) // append any global mods

  for (const mod of targetmods) {
    modifier += mod.modint
    maxtarget = (await applyModifierDescription(actor, mod.desc)) || maxtarget
  }

  const speaker = ChatMessage.getSpeaker({ actor: actor as Actor.Stored })

  const messageMode = calculateMessageMode(
    FoundryUtils.MessageMode,
    !!optionalArgs.blind || !!optionalArgs.event?.blind,
    optionalArgs.event
  )

  let roll = null // Will be the Roll

  const multiples: { rtotal: number; loaded: boolean; rolls: string }[] = [] // The roll results (to display the individual dice rolls)

  const chatdata: RollChatData = {
    prefix: prefix.trim(),
    chatthing: chatthing,
    thing: thing,
    origtarget: origtarget,
    fromUser: fromUser?.id,
    targetmods,
    multiples,
    isBlind: false,
  }

  if (isTargeted) {
    // This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
    let finaltarget = origtarget + modifier

    if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget

    if (thing) {
      //let flav = thing.replace(/\[.*\] */, '') // Flavor text cannot handle internal []
      const r1 = /\[/g
      const r2 = /\]/g
      const flav = thing.replaceAll(r1, '').replaceAll(r2, '') // Flavor text cannot handle internal []

      formula = formula.replace(/^(\d+d6)/, `$1[${flav.trim()}]`)
    }

    const roll = Roll.create(formula) as GurpsRoll // The formula will always be "3d6" for a "targetted" roll

    await roll.evaluate()
    const rtotal = roll.total!

    chatdata.showPlus = true
    chatdata.rtotal = rtotal
    chatdata.loaded = !!roll.isLoaded
    chatdata.rolls = roll.dice[0] ? roll.dice[0].results.map(it => it.result.toString()).join(',') : ''
    chatdata.modifier = modifier
    chatdata.finaltarget = finaltarget

    // Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
    const isCritSuccess = rtotal <= 4 || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16)
    const isCritFailure =
      rtotal >= 18 || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0)
    const margin = finaltarget - rtotal
    const seventeen = rtotal >= 17

    failure = seventeen || margin < 0

    chatdata.isCritSuccess = isCritSuccess
    chatdata.isCritFailure = isCritFailure
    chatdata.margin = margin
    chatdata.failure = failure
    chatdata.seventeen = seventeen
    chatdata.isDraggable = !seventeen && margin != 0
    chatdata.otf = (margin >= 0 ? '+' + margin : margin) + ' margin for ' + thing
    chatdata.followon = optionalArgs.followon

    // If the attached obj has Recoil information, do the additional math.
    if (margin > 0 && !!optionalArgs.obj && !!optionalArgs.obj.rcl) {
      /** @type {import('../../rules/combat/ranged/missile-weapon-attacks.js').WeaponDescriptor} */
      const weapon = { recoil: optionalArgs.obj.rcl as string, rateOfFire: optionalArgs.obj.rof as string }
      const potentialHits = MissileWeaponAttacks.computePotentialHits(weapon, optionalArgs.shots, margin)

      chatdata.rof = potentialHits.rateOfFire
      chatdata.rcl = potentialHits.recoil
      chatdata.rofrcl = potentialHits.potentialHits
    }

    chatdata['optlabel'] = optionalArgs.text || ''

    //detecting DiceSoNice module via custom property of the game object
    if ((game as any).dice3d && !(game as any).dice3d.messageHookDisabled) {
      // save for after roll animation is complete
      if (failure && optionalArgs.obj?.failotf)
        GURPS.modules.Otf.pendingOTFs.unshift(optionalArgs.obj.failotf as string)
      if (!failure && optionalArgs.obj?.passotf)
        GURPS.modules.Otf.pendingOTFs.unshift(optionalArgs.obj.passotf as string)
    } else {
      if (failure && optionalArgs.obj?.failotf)
        GURPS.modules.Otf.executeOTF(optionalArgs.obj.failotf as string, false, optionalArgs.event, null)
      if (!failure && optionalArgs.obj?.passotf)
        GURPS.modules.Otf.executeOTF(optionalArgs.obj.passotf as string, false, optionalArgs.event, null)
    }

    const result = {
      rtotal: rtotal,
      loaded: !!roll.isLoaded,
      rolls: roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : '',
    }

    multiples.push(result)
  } else {
    // This is non-targeted, non-damage roll where the modifier is added to the roll, not the target
    // NOTE:   Damage rolls have been moved to damagemessage.js/DamageChat

    let min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    const max = +optionalArgs.event?.data?.repeat || 1

    if (max > 1) chatdata['chatthing'] = 'x' + max

    for (let i = 0; i < max; i++) {
      roll = Roll.create(formula + `+${modifier}`) as GurpsRoll
      await roll.evaluate()

      let rtotal = roll.total!

      if (rtotal < min) {
        rtotal = min
      }

      // ? if (rtotal == 1) thing = thing.replace('points', 'point')
      const result = {
        rtotal: rtotal,
        loaded: roll.isLoaded,
        rolls: roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : '',
      }

      multiples.push(result)
    }

    chatdata['modifier'] = modifier
  }

  if (isTargeted) setLastTargetedRoll(chatdata, speaker.actor, speaker.token, true)

  // For last, let's consume this action in Token
  const actorToken = canvas?.tokens?.placeables.find(token => token.id === speaker.token)

  if (actorToken) {
    const actions = await TokenActions.fromToken(actorToken)

    await actions.consumeAction(action, chatthing, optionalArgs.obj, usingRapidStrike)
  }

  chatdata.isBlind = messageMode.isBlind

  const message = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/die-roll-chat-message.hbs',
    chatdata
  )

  const messageData = {
    user: game.user?.id,
    speaker: speaker,
    content: message,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    //whisper has no functionality for blind rolls, so wey do we pass that?
    whisper: optionalArgs.event?.shiftKey
      ? game.user?.id
      : messageMode.isBlind
        ? ChatMessage.getWhisperRecipients('GM').map(user => user.id)
        : undefined,
    blind: messageMode.isBlind,
  }

  // @ts-expect-error: not sure how this is supposed to work
  ChatMessage.applyRollMode(messageData, messageMode.value)

  const options = { messageMode: messageMode.value }

  // @ts-expect-error: Create Options for Chat Messages seems not to be properly typed
  ChatMessage.create(messageData, options)

  if (isTargeted && (action.type === OtfActionType.attribute || action.type === OtfActionType.skillSpell)) {
    const users = actor?.getOwners() ?? []
    const ids = users.map(it => it.id)

    if (!failure && !!action.truetext) {
      const messageData = {
        whisper: ids,
        content: action.truetext,
      }

      ChatMessage.create(messageData)
    }

    if (failure && !!action.falsetext) {
      const messageData = {
        whisper: ids,
        content: action.falsetext,
      }

      ChatMessage.create(messageData)
    }
  }

  return !failure
}
