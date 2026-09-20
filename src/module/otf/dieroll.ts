import { MeleeAttackModel } from '@module/action/melee-attack.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { ActionType } from '@module/action/types.js'
import { GurpsRoll } from '@module/modifier-bucket/bucket-app.js'
import { OtfActionType, OtfRollAction } from '@module/otf/types.js'
import { FoundryUtils, MessageMode } from '@module/util/foundry-utils.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { getTokenForActor } from '@module/util/token.js'
import { MissileWeaponAttacks } from '@rules/combat/ranged/missile-weapon-attacks.js'
import { stripBracketContents } from '@util/utilities.js'

import { TokenActions } from '../token-actions.js'

import { ActionFuncContext } from './actionFuncs.js'
import { CanRollResult, canRoll } from './canRoll.js'
import { applyModifierDescription } from './description-utilities.js'
import { RollConfirmationData, RollConfirmationDialog } from './rollConfirmationDialog.js'

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

export function calculateMessageMode(baseMode: MessageMode, blindOverride: boolean, event?: ActionFuncContext | null) {
  const KeyboardManager = foundry.helpers.interaction.KeyboardManager

  //apply modifier Keys from the event and current Modifier key, so that they can be pressed when the OTF is clicked or when the roll confirmation dialog is confirmed
  const ctrlKey =
    (event?.ctrlKey ?? false) ||
    // @ts-expect-error - Foundry VTT API not fully typed
    (game?.keyboard.isModifierActive(KeyboardManager?.MODIFIER_KEYS.CONTROL) ?? false) ||
    // On macOS, allow the Option key as an additional blind-roll shortcut without removing the existing Ctrl/Command shortcut.
    (globalThis.navigator?.platform?.includes('Mac') &&
      (event?.altKey ||
        // @ts-expect-error - Foundry VTT API not fully typed
        game.keyboard.isModifierActive(KeyboardManager?.MODIFIER_KEYS.ALT ?? false)))

  const shiftKey =
    (event?.shiftKey ?? false) ||
    // @ts-expect-error - Foundry VTT API not fully typed
    (game?.keyboard?.isModifierActive(KeyboardManager?.MODIFIER_KEYS.SHIFT) ?? false)

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
  context,
  fromUser = game.user,
  action,
  item,
  attack,
}: {
  actor: Actor.Implementation | null
  formula?: string
  targetmods?: Modifier[]
  prefix?: string
  thing?: string
  chatthing?: string
  origtarget?: number
  context?: ActionFuncContext | null
  fromUser?: User | null
  action: OtfRollAction
  item?: Item.Implementation
  attack?: MeleeAttackModel | RangedAttackModel
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
      ? await canRoll(action, actor, token ?? null, attack, item)
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
    await actor.addTaggedRollModifiers(action, item, attack)
  }

  const messageMode = calculateMessageMode(FoundryUtils.MessageMode, !!action.blindroll || !!context?.blind, context)

  const showRollDialog = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)

  if (showRollDialog && actor instanceof Actor) {
    // Get Target Info
    const targetData = actor.findUsingAction(action, chatthing, formula, thing)
    const itemId = targetData.fromItem || targetData.itemId
    const item = actor.items.get(itemId ?? '')

    const isSimpleRoll = ([OtfActionType.roll, OtfActionType.derivedRoll] as OtfActionType[]).includes(action.type)
    const dialogData: RollConfirmationData = isSimpleRoll
      ? {
          type: 'simpleRoll',
          messages,
          action,
          actor,
          token,
          formula,
          name: targetData.name,
          messageMode,
        }
      : {
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
          attack: attack,
          messageMode,
        }

    const rollApproved = await RollConfirmationDialog.wait(dialogData)

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
        context,
        fromUser,
        action,
        item,
        attack,
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
      context,
      fromUser,
      action,
      item,
      attack,
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
  optlabel: string[]
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
  context,
  fromUser,
  action,
  item,
  attack,
}: {
  actor: Actor.Implementation | null
  formula: string
  targetmods: Modifier[]
  prefix: string
  thing: string
  chatthing: string
  origtarget: number
  context?: ActionFuncContext | null
  fromUser?: User | null
  action: OtfRollAction
  item?: Item.Implementation
  attack?: MeleeAttackModel | RangedAttackModel
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  const isTargeted = origtarget > 0 // Roll "against" something (true), or just a roll (false)

  // Let's collect up the modifiers, they are used differently depending on the type of roll
  targetmods = await GURPS.ModifierBucket.applyMods(targetmods) // append any global mods

  const speaker = ChatMessage.getSpeaker({ actor: actor as Actor.Stored })

  //check message mode again as modifier keys may have changed
  const messageMode = calculateMessageMode(FoundryUtils.MessageMode, !!action.blindroll || !!context?.blind, context)

  const multiples: { rtotal: number; loaded: boolean; rolls: string }[] = [] // The roll results (to display the individual dice rolls)

  const { modifier, maxtarget } = await calcModifierAndApplyCosts(targetmods, actor)

  let chatdata: RollChatData = {
    prefix: prefix.trim(),
    chatthing: chatthing,
    thing: thing,
    origtarget: origtarget,
    fromUser: fromUser?.id,
    targetmods,
    multiples,
    isBlind: false,
    optlabel: action.overridetxt ? [action.overridetxt] : [],
    modifier,
  }

  if (action.desc && !action.mod) {
    chatdata.optlabel.unshift(action.desc)
  }

  let roll = null // Will be the Roll

  if (isTargeted) {
    // This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
    const finaltarget = calcFinalTarget(origtarget, modifier, maxtarget)
    const flavoredFormula = addFlavorTextToFormula(thing, formula)

    // Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
    roll = await createAndEvaluateRoll(flavoredFormula)

    const targedtedRollData = getTargetedRollChatData(roll, finaltarget, action, attack, thing)

    chatdata = { ...chatdata, ...targedtedRollData }

    executePassFailOtfs(attack, item, targedtedRollData.failure, context)
  } else {
    // This is non-targeted, non-damage roll where the modifier is added to the roll, not the target
    // NOTE:   Damage rolls have been moved to damagemessage.js/DamageChat

    const min = formula.slice(-1) === '!' ? 1 : 0

    if (min === 1) {
      formula = formula.slice(0, -1)
    }

    const max = +context?.data?.repeat || 1

    if (max > 1) chatdata['chatthing'] = 'x' + max

    for (let i = 0; i < max; i++) {
      roll = await createAndEvaluateRoll(formula + `+${modifier}`)

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
  }

  if (isTargeted) setLastTargetedRoll(chatdata, speaker.actor, speaker.token, true)

  // For last, let's consume this action in Token
  const actorToken = canvas?.tokens?.placeables.find(token => token.id === speaker.token)

  if (actorToken) {
    const actions = await TokenActions.fromToken(actorToken)
    const usingRapidStrike = GURPS.ModifierBucket.modifierStack.usingRapidStrike

    await actions.consumeAction(action, chatthing, item, attack, usingRapidStrike)
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
    //whisper has no functionality for blind rolls, so why do we pass that?
    whisper: context?.shiftKey
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

    if (!chatdata.failure && !!action.truetext) {
      const messageData = {
        whisper: ids,
        content: action.truetext,
      }

      ChatMessage.create(messageData)
    }

    if (chatdata.failure && !!action.falsetext) {
      const messageData = {
        whisper: ids,
        content: action.falsetext,
      }

      ChatMessage.create(messageData)
    }
  }

  return !chatdata.failure
}

export function getTargetedRollChatData(
  roll: GurpsRoll,
  finaltarget: number,
  action: OtfRollAction,
  attack?: MeleeAttackModel | RangedAttackModel,
  thing?: string
) {
  const rtotal = roll.total!
  const margin = calcMargin(finaltarget, rtotal)
  const { seventeen, failure } = calcFailure(rtotal, margin)
  const { isCritSuccess, isCritFailure } = detectCriticals(rtotal, finaltarget)
  // If the attached obj has Recoil information, do the additional math.
  const { rof, rcl, rofrcl } = calculateRofHits(margin, action, attack)

  const multiples = []
  const result = {
    rtotal: rtotal,
    loaded: !!roll.isLoaded,
    rolls: roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : '',
  }

  multiples.push(result)

  return {
    showPlus: true,
    rtotal,
    loaded: !!roll.isLoaded,
    rolls: roll.dice[0] ? roll.dice[0].results.map(it => it.result.toString()).join(',') : '',
    finaltarget,
    isCritSuccess,
    isCritFailure,
    margin,
    failure,
    seventeen,
    isDraggable: !failure,
    otf: (margin >= 0 ? '+' + margin : margin) + ' margin for ' + thing,
    followon: action.type === OtfActionType.attack ? action.followon : undefined,
    rof,
    rcl,
    rofrcl,
    multiples,
  }
}

function addFlavorTextToFormula(thing: string, formula: string) {
  let newFormula = formula

  if (thing) {
    const flav = stripBracketContents(thing) // Flavor text cannot handle internal []

    newFormula = formula.replace(/^(\d+d6)/, `$1[${flav.trim()}]`)
  }

  return newFormula
}

async function createAndEvaluateRoll(formula: string) {
  const roll = Roll.create(formula) as GurpsRoll // The formula will always be "3d6" for a "targetted" roll

  await roll.evaluate()

  return roll
}

function executePassFailOtfs(
  attack: MeleeAttackModel | RangedAttackModel | undefined,
  item: Item.Implementation | undefined,
  failure: boolean,
  context: ActionFuncContext | null | undefined
) {
  const obj = attack ?? item?.system

  //detecting DiceSoNice module via custom property of the game object
  if ((game as any).dice3d && !(game as any).dice3d.messageHookDisabled) {
    // save for after roll animation is complete
    if (failure && obj?.failotf) GURPS.modules.Otf.pendingOTFs.unshift(obj.failotf)
    if (!failure && obj?.passotf) GURPS.modules.Otf.pendingOTFs.unshift(obj.passotf)
  } else {
    if (failure && obj?.failotf) GURPS.modules.Otf.executeOTF(obj.failotf, false, context, null)
    if (!failure && obj?.passotf) GURPS.modules.Otf.executeOTF(obj.passotf as string, false, context, null)
  }
}

export function calcFailure(rtotal: number, margin: number) {
  const seventeen = rtotal >= 17

  const failure = seventeen || margin < 0

  return { seventeen, failure }
}

async function calcModifierAndApplyCosts(targetmods: Modifier[], actor: Actor.Implementation | null) {
  let modifier = 0
  let maxtarget = null // If not null, then the target cannot be any higher than this.

  for (const mod of targetmods) {
    modifier += mod.modint
    //this claculates maxTarget and applys costs to the actor
    maxtarget = (await applyModifierDescription(actor, mod.desc)) || maxtarget
  }

  return { modifier, maxtarget }
}

export function calcFinalTarget(origtarget: number, modifier: number, maxtarget: number | null) {
  let finaltarget = origtarget + modifier

  if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget

  return finaltarget
}

function calcMargin(finaltarget: number, rtotal: number) {
  return finaltarget - rtotal
}

export function detectCriticals(rtotal: number, finaltarget: number) {
  const isCritSuccess = rtotal <= 4 || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16)
  const isCritFailure =
    rtotal >= 18 || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0)

  return { isCritSuccess, isCritFailure }
}

function calculateRofHits(
  margin: number,
  action: OtfRollAction,
  attack?: MeleeAttackModel | RangedAttackModel
): { rof?: string; rcl?: string; rofrcl?: number } {
  if (margin > 0 && action.type === OtfActionType.attack && attack?.isOfType(ActionType.RangedAttack)) {
    /** @type {import('../../rules/combat/ranged/missile-weapon-attacks.js').WeaponDescriptor} */
    const weapon = { recoil: attack.recoilText, rateOfFire: attack.rofText }
    const potentialHits = MissileWeaponAttacks.computePotentialHits(weapon, action.shots, margin)

    return { rof: potentialHits.rateOfFire, rcl: potentialHits.recoil, rofrcl: potentialHits.potentialHits }
  } else return {}
}
