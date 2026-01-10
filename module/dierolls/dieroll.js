import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'
import { getTokenForActor } from '../utilities/token.js'

export const rollData = target => {
  let targetColor, rollChance

  if (target < 6) {
    targetColor = '#b30000'
    rollChance = game.i18n.localize('GURPS.veryHardRoll')
  } else if (target < 11) {
    targetColor = '#cc6600'
    rollChance = game.i18n.localize('GURPS.hardRoll')
  } else if (target < 14) {
    targetColor = '#fdfdbd'
    rollChance = game.i18n.localize('GURPS.fairRoll')
  } else if (target < 17) {
    targetColor = '#5cbd58'
    rollChance = game.i18n.localize('GURPS.easyRoll')
  } else {
    targetColor = '#0a8d0a'
    rollChance = game.i18n.localize('GURPS.veryEasyRoll')
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
export const addBucketToDamage = (formula, addDamageType = true) => {
  let dice = undefined
  let value = undefined

  if (formula.match(/^(?<dice>\d+)d/)) {
    dice = parseInt(formula.match(/^(?<dice>\d+)d/).groups.dice)
  } else if (formula.match(/^(?<number>\d+)/)) {
    value = parseInt(formula.match(/^(?<number>\d+)/).groups.number)
  }

  const add = parseInt(formula.match(/([+-]\d+)/)?.[1] || 0)
  const damageType = formula.match(/\s(\w+)/)?.[1] || ''

  const armorDivisor = formula.match(/(?<=\()\S+(?=\))/)?.[0]
  const hasMinDamage = formula.includes('!')
  const multiplier = formula.match(/(?<=[xX*])\d+(\.\d+)?/)?.[0] || ''
  const costFormula = formula.match(/(?<=\*)\D.+/)?.[0] || ''

  const bucketMod = GURPS.ModifierBucket.currentSum()
  let newAdd = add + bucketMod

  if (!dice && value) {
    return `${value + newAdd} ${addDamageType ? damageType : ''}`.trim()
  }

  if (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS)) {
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
  action = null,
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)

  const taggedSettings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
  let result = { canRoll: true, hasActions: true }
  let token

  if (actor instanceof Actor && action) {
    const actorTokens =
      canvas.tokens?.placeables.filter(t => {
        if (t.actor) return t.actor.id === actor.id
        ui.notifications?.warn(`Token is not linked to an actor [${t.id}]`)

        return false
      }) || []

    if (actorTokens.length === 1) {
      token = actorTokens[0]
    } else {
      token = getTokenForActor(actor)
    }

    result = await actor.canRoll(action, token, chatthing, optionalArgs.obj)
  }

  const messages = Object.keys(result)
    .filter(key => key.toLowerCase().includes('message') && !!result[key])
    .map(key => result[key])

  if (!result.canRoll) {
    for (const message of messages) {
      ui.notifications.warn(message)
    }

    return false
  }

  let bucketRoll
  let displayFormula = formula
  const isAttributeOrCheckRoll = Object.keys(GURPS.PARSELINK_MAPPINGS).includes(
    chatthing.split('@').pop().slice(0, -1).toUpperCase()
  )

  if (actor instanceof Actor && (action || isAttributeOrCheckRoll) && taggedSettings.autoAdd) {
    // We need to clear all tagged modifiers from the bucket when user starts
    // a new targeted roll (for the same actor or another)
    await GURPS.ModifierBucket.clearTaggedModifiers()

    for (let mod of targetmods || []) {
      GURPS.ModifierBucket.addModifier(mod.mod, mod.desc || 'from action')
    }

    targetmods = []
    const isDamageRoll = await actor.addTaggedRollModifiers(chatthing, optionalArgs)

    if (isDamageRoll) {
      displayFormula = addBucketToDamage(formula)
      const currentSum = GURPS.ModifierBucket.currentSum()
      const signal = currentSum >= 0 ? '+' : ''

      bucketRoll = `(${signal}${currentSum})`
    }
  }

  const showRollDialog = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)

  if (showRollDialog && actor instanceof Actor) {
    // Get Actor Info
    const tokenImg = token?.document.texture.src || actor?.img
    const isVideo = tokenImg?.includes('webm') || tokenImg?.includes('mp4')
    const tokenName = token?.name || actor?.name

    // Get Math Info
    let totalMods = GURPS.ModifierBucket.currentSum()
    const operator = totalMods >= 0 ? '+' : '-'
    let totalRoll = origtarget + totalMods

    // Set min value 3 for targeted rolls
    totalRoll = Math.max(totalRoll, 3)
    totalMods = Math.abs(totalMods)

    // Get Target Info
    const targetData = actor.findUsingAction(action, chatthing, formula, thing)
    const itemId = targetData.fromItem || targetData.itemId
    const item = actor.items.get(itemId)
    const itemImage = item?.img || ''
    let itemIcon, itemColor, rollType
    let targetRoll = targetData.name

    if (origtarget > 0) targetRoll += `-${origtarget}`

    let template = 'confirmation-roll.hbs'

    // If we receive a single formula
    // like `/1d6+2` we need
    // to process it like a single roll
    let damageRoll,
      damageType,
      damageTypeLabel,
      damageTypeIcon,
      damageTypeColor,
      simpleFormula,
      originalFormula,
      otfDamageText,
      usingDiceAdd

    if (!action && !chatthing && targetData.name === formula) {
      template = 'confirmation-damage-roll.hbs'
      const damageOTFType = prefix.match(/\[(.+)]/)?.[1] || ''

      if (['thrust', 'swing', 'sw', 'thr'].includes(damageOTFType.toLowerCase())) {
        // Special Case: `[thrust]` and `[swing]` OTFs are formula based, not targeted rolls
        // We receive here the full dice formula, like 1d6+2, and we need to extract the dice + adds parts
        // For example, for the formula `1d6+2` we need to extract `1d` and `+2` to show in the confirmation dialog
        // Because this is a simple roll and not a damage roll, we need to show the damage type as `dmg`
        otfDamageText = game.i18n.localize(`GURPS.${damageOTFType}`, damageOTFType)
        damageType = 'dmg'
        damageTypeLabel = game.i18n.localize(
          `GURPS.damageType${GURPS.DamageTables.woundModifiers[damageType]?.label}`,
          damageType
        )
        damageTypeIcon = GURPS.DamageTables.woundModifiers[damageType]?.icon || '<i class="fas fa-dice-d6"></i>'
        damageTypeColor = GURPS.DamageTables.woundModifiers[damageType]?.color || '#772e21'
        usingDiceAdd = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_MODIFY_DICE_PLUS_ADDS)
      }

      const dice = displayFormula.match(/\d+d/)?.[0] || ''
      const adds = displayFormula.match(/[+-]\d+/)?.[0] || ''

      simpleFormula = `${dice}${adds}`
      originalFormula = simpleFormula
      damageRoll = simpleFormula
    }

    // If Max Actions Check is enabled get Consume Action Info
    let consumeActionIcon, consumeActionLabel, consumeActionColor
    const settingsAllowAfterMaxActions = game.settings.get(
      Settings.SYSTEM_NAME,
      Settings.SETTING_ALLOW_AFTER_MAX_ACTIONS
    )
    const settingsUseMaxActions = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_MAX_ACTIONS)
    const dontShowMaxActions =
      settingsUseMaxActions === 'Disable' || (!result.isCombatant && settingsUseMaxActions === 'AllCombatant')

    if (settingsAllowAfterMaxActions !== 'Allow' && !dontShowMaxActions) {
      const canConsumeAction = actor.canConsumeAction(action, chatthing, optionalArgs.obj)

      consumeActionIcon = !result.hasActions
        ? '<i class="fas fa-exclamation"></i>'
        : canConsumeAction
          ? '<i class="fas fa-plus"></i>'
          : '<i class="fas fa-check"></i>'
      consumeActionLabel = !result.hasActions
        ? game.i18n.localize('GURPS.noActionsAvailable')
        : canConsumeAction
          ? game.i18n.localize('GURPS.willConsumeAction')
          : game.i18n.localize('GURPS.isFreeAction')
      consumeActionColor = !result.hasActions
        ? 'rgb(215,185,33)'
        : canConsumeAction
          ? 'rgba(20,119,180,0.7)'
          : 'rgb(51,114,68,0.7)'
    }

    // Get Target Roll Info
    switch (action?.type || 'undefined') {
      case 'attack':
        if (action.isMelee) {
          itemIcon = 'fas fa-sword'
          itemColor = 'rgba(12,79,119)'
          rollType = game.i18n.localize('GURPS.melee')
        } else {
          itemIcon = 'fas fa-crosshairs'
          itemColor = 'rgba(12,79,119)'
          rollType = game.i18n.localize('GURPS.ranged')
        }

        break
      case 'weapon-parry':
        itemIcon = 'fas fa-swords'
        itemColor = '#9a5f16'
        rollType = game.i18n.localize('GURPS.parry')
        break
      case 'weapon-block':
        itemIcon = 'fas fa-shield-halved'
        itemColor = '#9a5f16'
        rollType = game.i18n.localize('GURPS.block')
        break
      case 'skill-spell':
        if (chatthing.toLowerCase().includes('@sk:')) {
          itemIcon = 'fas fa-book'
          itemColor = '#015401'
          rollType = game.i18n.localize('GURPS.skill')
        } else {
          itemIcon = 'fa fa-wand-magic-sparkles'
          itemColor = '#6f63d9'
          rollType = game.i18n.localize('GURPS.spell')
        }

        break
      case 'controlroll':
        itemIcon = 'fas fa-head-side-gear'
        itemColor = '#c5360b'
        rollType = game.i18n.localize('GURPS.ControlRoll')
        break

      case 'attribute': {
        itemColor = '#620707'
        const ref = chatthing.split('@').pop().slice(0, -1)

        switch (ref) {
          case 'ST':
            itemIcon = 'fas fa-dumbbell'
            rollType = game.i18n.localize('GURPS.attributesSTNAME')
            break
          case 'DX':
            itemIcon = 'fas fa-running'
            rollType = game.i18n.localize('GURPS.attributesDXNAME')
            break
          case 'HT':
            itemIcon = 'fas fa-heart'
            rollType = game.i18n.localize('GURPS.attributesHTNAME')
            break
          case 'IQ':
            itemIcon = 'fas fa-brain'
            rollType = game.i18n.localize('GURPS.attributesIQNAME')
            break
          case 'WILL':
            itemIcon = 'fas fa-brain'
            rollType = game.i18n.localize('GURPS.attributesWILLNAME')
            break
          case 'Vision':
            itemIcon = 'fas fa-eye'
            rollType = game.i18n.localize('GURPS.vision')
            break
          case 'PER':
            itemIcon = 'fas fa-signal-stream'
            rollType = game.i18n.localize('GURPS.attributesPERNAME')
            break
          case 'Fright Check':
            itemIcon = 'fas fa-face-scream'
            rollType = game.i18n.localize('GURPS.frightcheck')
            break
          case 'Hearing':
            itemIcon = 'fas fa-ear'
            rollType = game.i18n.localize('GURPS.hearing')
            break
          case 'Taste Smell':
            itemIcon = 'fas fa-nose'
            rollType = game.i18n.localize('GURPS.tastesmell')
            break
          case 'Touch':
            itemIcon = 'fa-solid fa-hand-point-up'
            rollType = game.i18n.localize('GURPS.touch')
            break
          case 'Dodge':
            itemIcon = 'fas fa-person-running-fast'
            rollType = game.i18n.localize('GURPS.dodge')
            break
          default:
            itemIcon = 'fas fa-dice'
            rollType = targetData?.name
              ? targetData.name
              : thing
                ? thing.charAt(0).toUpperCase() + thing.toLowerCase().slice(1)
                : formula
        }

        break
      }

      default:
        itemIcon = 'fas fa-dice'
        itemColor = '#015401'
        rollType = thing ? thing.charAt(0).toUpperCase() + thing.toLowerCase().slice(1) : formula
    }

    const { targetColor, rollChance } = rollData(totalRoll)

    // Before open a new dialog, we need to make sure
    // all other dialogs are closed, because bucket must be soft reset
    // before we start a new roll

    // TODO The problem with this is that when we are opening one Confirmation Roll Dialog immediately  after
    // another, the first one may still be open, and clicking the Cancel button sets stopActions to true, which
    // prevents the second dialog from opening.
    // await cancelButton.click().promise()

    if ($(document).find('.dialog-button.cancel').length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500))

      for (const button of $(document).find('.dialog-button.cancel')) {
        console.log('clicking cancel button')
        await button.click()
      }
    }

    await $(document).find('.dialog-button.cancel').click().promise()
    let doRollResult = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.localize('GURPS.confirmRoll'),
        resizable: true,
      },
      position: {
        height: 'auto',
      },
      content: await foundry.applications.handlebars.renderTemplate(`systems/gurps/templates/${template}`, {
        formula: formula,
        thing: thing,
        target: origtarget,
        targetmods: targetmods,
        prefix: prefix,
        chatthing: chatthing,
        optionalArgs: optionalArgs,
        tokenImg,
        tokenName,
        totalRoll,
        totalMods,
        operator,
        itemImage,
        itemIcon,
        targetRoll,
        itemColor,
        damageRoll,
        damageType,
        rollType,
        targetColor,
        rollChance,
        bucketRoll,
        messages,
        isVideo,
        consumeActionIcon,
        consumeActionLabel,
        consumeActionColor,
        damageTypeLabel,
        damageTypeIcon,
        damageTypeColor,
        simpleFormula,
        originalFormula,
        otfDamageText,
        usingDiceAdd,
      }),
      buttons: [
        {
          action: 'roll',
          icon: optionalArgs.blind ? 'fas fa-eye-slash' : 'fas fa-dice',
          label: optionalArgs.blind ? 'GURPS.blindRoll' : 'GURPS.roll',
          default: true,
          callback: async () => {
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
            })
          },
        },
        {
          action: 'cancel',
          icon: 'fas fa-times',
          label: 'GURPS.cancel',
          callback: async () => {
            await GURPS.ModifierBucket.clearTaggedModifiers()
            GURPS.stopActions = true

            return false
          },
        },
      ],
    })

    return doRollResult
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
    })
  }
}

/*
  This is the BIG method that does the roll and prepares the chat message.
  unfortunately, it has a lot fo hard coded junk in it.
  */
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn',
// target=skill level or -1=damage roll
async function _doRoll({
  actor,
  formula = '3d6',
  targetmods = [],
  prefix = '',
  thing = '',
  chatthing = '',
  origtarget = -1,
  optionalArgs = {},
  fromUser = game.user,
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  let isTargeted = origtarget > 0 // Roll "against" something (true), or just a roll (false)
  let failure = false

  let chatdata = {
    prefix: prefix.trim(),
    chatthing: chatthing,
    thing: thing,
    origtarget: origtarget,
    fromUser: fromUser.id,
  }

  // Let's collect up the modifiers, they are used differently depending on the type of roll
  let modifier = 0
  let maxtarget = null // If not null, then the target cannot be any higher than this.
  const usingRapidStrike = GURPS.ModifierBucket.modifierStack.usingRapidStrike

  targetmods = await GURPS.ModifierBucket.applyMods(targetmods) // append any global mods

  chatdata['targetmods'] = targetmods
  let multiples = [] // The roll results (to display the individual dice rolls)

  chatdata['multiples'] = multiples

  for (let m of targetmods) {
    modifier += m.modint
    maxtarget = (await GURPS.applyModifierDesc(actor, m.desc)) || maxtarget
  }

  actor = actor || game.user
  let speaker = ChatMessage.getSpeaker({ actor: actor })
  let messageData = {
    user: game.user.id,
    speaker: speaker,
  }

  if (optionalArgs.event?.data?.private) {
    messageData.whisper = [game.user.id]
  }

  let roll = null // Will be the Roll

  if (isTargeted) {
    // This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
    let finaltarget = parseInt(origtarget) + modifier

    if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget

    if (thing) {
      //let flav = thing.replace(/\[.*\] */, '') // Flavor text cannot handle internal []
      const r1 = /\[/g
      const r2 = /\]/g
      let flav = thing.replaceAll(r1, '').replaceAll(r2, '') // Flavor text cannot handle internal []

      formula = formula.replace(/^(\d+d6)/, `$1[${flav.trim()}]`)
    }

    roll = Roll.create(formula) // The formula will always be "3d6" for a "targetted" roll
    await roll.evaluate()
    let rtotal = roll.total

    chatdata['showPlus'] = true
    chatdata['rtotal'] = rtotal
    chatdata['loaded'] = !!roll.isLoaded
    chatdata['rolls'] = roll.dice[0] ? roll.dice[0].results.map(it => it.result.toString()).join(',') : ''
    chatdata['modifier'] = modifier
    chatdata['finaltarget'] = finaltarget

    // Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
    let isCritSuccess = rtotal <= 4 || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16)
    let isCritFailure =
      rtotal >= 18 || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0)
    let margin = finaltarget - rtotal
    let seventeen = rtotal >= 17

    failure = seventeen || margin < 0

    chatdata['isCritSuccess'] = isCritSuccess
    chatdata['isCritFailure'] = isCritFailure
    chatdata['margin'] = margin
    chatdata['failure'] = failure
    chatdata['seventeen'] = seventeen
    chatdata['isDraggable'] = !seventeen && margin != 0
    chatdata['otf'] = (margin >= 0 ? '+' + margin : margin) + ' margin for ' + thing
    chatdata['followon'] = optionalArgs.followon

    // If the attached obj (see handleRoll()) has Recoil information, do the additional math.
    if (margin > 0 && !!optionalArgs.obj && !!optionalArgs.obj.rcl) {
      let rofText
      let potentialHits = Math.floor(margin / parseInt(optionalArgs.obj.rcl)) + 1

      const rof = Math.min(optionalArgs.shots || 1, parseInt(optionalArgs.obj.rof))

      potentialHits = Math.min(rof, potentialHits)
      rofText = potentialHits.toString()

      // Support shotgun RoF (3x9, for example).
      const matchShotgunRoF = optionalArgs.obj.rof.match(/(?<rof>\d+)[×xX*](?<projectiles>\d+)/)

      if (matchShotgunRoF) {
        potentialHits = potentialHits * matchShotgunRoF.groups.projectiles
        rofText = `${rof}x${matchShotgunRoF.groups.projectiles}`
      }

      chatdata['rof'] = rofText
      chatdata['rcl'] = optionalArgs.obj.rcl
      chatdata['rofrcl'] = potentialHits
    }

    chatdata['optlabel'] = optionalArgs.text || ''

    if (game.dice3d && !game.dice3d.messageHookDisabled) {
      // save for after roll animation is complete
      if (failure && optionalArgs.obj?.failotf) GURPS.PendingOTFs.unshift(optionalArgs.obj.failotf)
      if (!failure && optionalArgs.obj?.passotf) GURPS.PendingOTFs.unshift(optionalArgs.obj.passotf)
    } else {
      if (failure && optionalArgs.obj?.failotf) GURPS.executeOTF(optionalArgs.obj.failotf, optionalArgs.event)
      if (!failure && optionalArgs.obj?.passotf) GURPS.executeOTF(optionalArgs.obj.passotf, optionalArgs.event)
    }

    let r = {}

    r['rtotal'] = rtotal
    r['loaded'] = !!roll.isLoaded
    r['rolls'] = roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : ''
    multiples.push(r)
  } else {
    // This is non-targeted, non-damage roll where the modifier is added to the roll, not the target
    // NOTE:   Damage rolls have been moved to damagemessage.js/DamageChat

    let min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let max = +optionalArgs.event?.data?.repeat || 1

    if (max > 1) chatdata['chatthing'] = 'x' + max

    for (let i = 0; i < max; i++) {
      roll = Roll.create(formula + `+${modifier}`)
      await roll.evaluate()

      let rtotal = roll.total

      if (rtotal < min) {
        rtotal = min
      }

      // ? if (rtotal == 1) thing = thing.replace('points', 'point')
      let r = {}

      r['rtotal'] = rtotal
      r['loaded'] = !!roll.isLoaded
      r['rolls'] = roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : ''
      multiples.push(r)
    }

    chatdata['modifier'] = modifier
  }

  chatdata['isBlind'] = !!(optionalArgs.blind || optionalArgs.event?.blind)
  if (isTargeted) GURPS.setLastTargetedRoll(chatdata, speaker.actor, speaker.token, true)

  // For last, let's consume this action in Token
  const actorToken = canvas.tokens?.placeables.find(t => t.id === speaker.token)

  if (actorToken) {
    const actions = await TokenActions.fromToken(actorToken)

    await actions.consumeAction(optionalArgs.action, chatthing, optionalArgs.obj, usingRapidStrike)
  }

  let message = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/die-roll-chat-message.hbs',
    chatdata
  )

  messageData.content = message
  messageData.rolls = [roll]

  if (optionalArgs.event?.shiftKey) {
    messageData.whisper = [game.user.id]
  }

  let isCtrl = false
  let creatOptions = {}

  try {
    isCtrl = !!optionalArgs.event && game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)
  } catch {
    // Keyboard manager may not be available during initialization
  }

  if (
    game.settings.get('core', 'rollMode') === 'blindroll' ||
    !!optionalArgs.blind ||
    !!optionalArgs.event?.blind ||
    isCtrl ||
    (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHIFT_CLICK_BLIND) && !!optionalArgs.event?.shiftKey)
  ) {
    messageData.whisper = ChatMessage.getWhisperRecipients('GM').map(u => u.id)
    messageData.blind = true
  }

  creatOptions.rollMode = messageData.blind ? 'blindroll' : game.settings.get('core', 'rollMode')

  messageData.sound = CONFIG.sounds.dice
  ChatMessage.create(messageData, creatOptions)

  if (isTargeted && !!optionalArgs.action) {
    let users = actor.isSelf ? [] : actor.getOwners()
    let ids = users.map(it => it.id)
    let messageData = {
      whisper: ids,
    }

    if (!failure && !!optionalArgs.action.truetext) messageData.content = optionalArgs.action.truetext
    if (failure && !!optionalArgs.action.falsetext) messageData.content = optionalArgs.action.falsetext
    if (messageData.content) ChatMessage.create(messageData)
  }

  return !failure
}
