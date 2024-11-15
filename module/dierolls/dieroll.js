import * as Settings from '../../lib/miscellaneous-settings.js'
import { i18n } from '../../lib/utilities.js'

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
 * Formula examples: 2d+2, 1d-1, 3d6, 1d-2
 * Can use the optional rule (B269) to round damage: +7 points = +2d and +4 points = +1d
 *
 * @param {string} formula
 * @param {boolean} addDamageType
 * @returns {string}
 */
export const addBucketToDamage = (formula, addDamageType = true) => {
  let dice = parseInt(formula.match(/(\d+)d/)?.[1] || 1)
  const add = parseInt(formula.match(/([+-]\d+)/)?.[1] || 0)
  const damageType = formula.match(/\d\s(.+)/)?.[1] || ''
  const bucketMod = GURPS.ModifierBucket.currentSum()
  let newAdd = add + bucketMod
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
  return `${dice}d${plus}${newAdd !== 0 ? newAdd : ''} ${addDamageType ? damageType : ''}`.trim()
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
  let result = { canRoll: true }
  if (actor instanceof Actor && action) {
    result = await actor.canRoll(action)
  }
  if (!result.canRoll) {
    if (result.message) ui.notifications.warn(result.message)
    if (result.targetMessage) ui.notifications.warn(result.targetMessage)
    return false
  }

  let bucketRoll
  let displayFormula = formula

  if (actor instanceof Actor && taggedSettings.autoAdd) {
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
    const token = actor?.getActiveTokens()?.[0] || canvas.tokens.controlled[0]
    const tokenImg = token?.document.texture.src || actor?.img
    const tokenName = token?.name || actor?.name

    // Get Math Info
    let totalMods = GURPS.ModifierBucket.currentSum()
    const operator = totalMods >= 0 ? '+' : '-'
    const totalRoll = origtarget + totalMods
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

    // Special Case: thrust and swing buttons are formula based, not targeted rolls
    let damageRoll, damageType
    if (!action && !chatthing && targetData.name === formula) {
      const damage = prefix.match(/\[(.+)]/)?.[1] || ''
      damageType = damage === 'thrust' ? 'thr' : 'sw'
      damageRoll = displayFormula
      template = 'confirmation-damage-roll.hbs'
    }

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
      case 'attribute':
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
            rollType = !!targetData?.name
              ? targetData.name
              : thing
                ? thing.charAt(0).toUpperCase() + thing.toLowerCase().slice(1)
                : formula
        }
        break
      default:
        itemIcon = 'fas fa-dice'
        itemColor = '#015401'
        rollType = thing ? thing.charAt(0).toUpperCase() + thing.toLowerCase().slice(1) : formula
    }

    const { targetColor, rollChance } = rollData(origtarget)

    const dialog = new Dialog({
      title: game.i18n.localize('GURPS.confirmRoll'),
      content: await renderTemplate(`systems/gurps/templates/${template}`, {
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
        messages: [result.message || '', result.targetMessage || ''].filter(it => !!it),
      }),
      buttons: {
        roll: {
          icon: !!optionalArgs.blind ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-dice"></i>',
          label: !!optionalArgs.blind ? i18n('GURPS.blindRoll') : i18n('GURPS.roll'),
          callback: async () => {
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
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: i18n('GURPS.cancel'),
          callback: async () => {
            await GURPS.ModifierBucket.clear()
          },
        },
      },
      default: 'roll',
    })
    // Before open a new dialog, we need to make sure
    // all other dialogs are closed, because bucket must be reset
    // before we start a new roll
    await $(document).find('.dialog-button.cancel').click().promise()
    await dialog.render(true)
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
    if (!!thing) {
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
    chatdata['rolls'] = !!roll.dice[0] ? roll.dice[0].results.map(it => it.result.toString()).join(',') : ''
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

    if (margin > 0 && !!optionalArgs.obj && !!optionalArgs.obj.rcl) {
      // if the attached obj (see handleRoll()) as Recoil information, do the additional math
      let rofrcl = Math.floor(margin / parseFloat(optionalArgs.obj.rcl)) + 1
      if (!!optionalArgs.obj.rof) {
        let rof = optionalArgs.obj.rof
        let m = rof.match(/(\d+)[×xX\*](\d+)/) // Support shotgun RoF (3x9)
        if (!!m) rofrcl = Math.min(rofrcl, parseInt(m[1]) * parseInt(m[2]))
        else rofrcl = Math.min(rofrcl, parseInt(rof))
      }

      chatdata['rof'] = optionalArgs.obj.rof
      chatdata['rcl'] = optionalArgs.obj.rcl
      chatdata['rofrcl'] = rofrcl
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
    r['rolls'] = !!roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : ''
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
      r['rolls'] = !!roll.dice[0] ? roll.dice[0].results.map(it => it.result).join() : ''
      multiples.push(r)
    }
    chatdata['modifier'] = modifier
  }
  chatdata['isBlind'] = !!(optionalArgs.blind || optionalArgs.event?.blind)
  if (isTargeted) GURPS.setLastTargetedRoll(chatdata, speaker.actor, speaker.token, true)

  let message = await renderTemplate('systems/gurps/templates/die-roll-chat-message.hbs', chatdata)

  messageData.content = message
  messageData.rolls = [roll]

  let whoCanSeeDice = null
  if (optionalArgs.event?.shiftKey) {
    whoCanSeeDice = [game.user.id]
    messageData.whisper = [game.user.id]
  }

  let isCtrl = false
  let creatOptions = {}
  try {
    isCtrl = !!optionalArgs.event && game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)
  } catch {}

  if (
    !!optionalArgs.blind ||
    !!optionalArgs.event?.blind ||
    isCtrl ||
    (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHIFT_CLICK_BLIND) && !!optionalArgs.event?.shiftKey)
  ) {
    messageData.whisper = ChatMessage.getWhisperRecipients('GM').map(u => u.id)
    // messageData.blind = true  // possibly not used anymore
    creatOptions.rollMode = 'blindroll' // new for V9
  }

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
    if (!!messageData.content) ChatMessage.create(messageData)
  }
  return !failure
}
