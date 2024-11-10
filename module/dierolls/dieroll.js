import * as Settings from '../../lib/miscellaneous-settings.js'

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

  const result = actor && action ? await actor.canRoll(action) : undefined
  if (!!result && !result.canRoll) {
    if (result.message) ui.notifications.warn(result.message)
    return false
  }

  const canAddTaggedRollModifiers = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_AUTO_ADD_TAGGED_MODIFIERS)
  if (actor && canAddTaggedRollModifiers) await actor.addTaggedRollModifiers(chatthing, optionalArgs)

  const showRollDialog = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHOW_CONFIRMATION_ROLL_DIALOG)
  let canRoll = false
  if (showRollDialog) {
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
    const targetData = actor.findUsingAction(action, chatthing)
    const itemId = targetData.fromItem || targetData.itemId
    const item = actor.items.get(itemId)
    const itemImage = item?.img || ''
    let itemIcon, itemColor
    let targetRoll = `${targetData.name}-${origtarget}`
    switch (action?.type || 'undefined') {
      case 'attack':
        if (action.isMelee) {
          itemIcon = 'fas fa-sword'
          itemColor = 'rgba(12,79,119)'
        } else {
          itemIcon = 'fas fa-crosshairs'
          itemColor = 'rgba(12,79,119)'
        }
        break
      case 'weapon-parry':
        itemIcon = 'fas fa-swords'
        itemColor = '#9a5f16'
        break
      case 'weapon-block':
        itemIcon = 'fas fa-shield-halved'
        itemColor = '#9a5f16'
        break
      case 'skill-spell':
        if (chatthing.toLowerCase().includes('@sk:')) {
          itemIcon = 'fas fa-book'
          itemColor = '#015401'
        } else {
          itemIcon = 'fas fa-spell'
          itemColor = '#6f63d9'
        }
        break
      case 'controlroll':
        itemIcon = 'fas fa-head-side-gear'
        itemColor = '#c5360b'
        break
      case 'attribute':
        itemColor = '#620707'
        const ref = chatthing.split('@').pop().slice(0, -1)
        switch (ref) {
          case 'ST':
            itemIcon = 'fas fa-dumbbell'
            break
          case 'DX':
            itemIcon = 'fas fa-running'
            break
          case 'HT':
            itemIcon = 'fas fa-heart'
            break
          case 'IQ':
          case 'WILL':
            itemIcon = 'fas fa-brain'
            break
          case 'Vision':
            itemIcon = 'fas fa-eye'
            break
          case 'PER':
            itemIcon = 'fas fa-signal-stream'
            break
          case 'Fright Check':
            itemIcon = 'fas fa-face-scream'
            break
          case 'Hearing':
            itemIcon = 'fas fa-ear'
            break
          case 'Taste Smell':
            itemIcon = 'fas fa-nose'
            break
          case 'Touch':
            itemIcon = 'fa-solid fa-hand-point-up'
            break
          case 'Dodge':
            itemIcon = 'fas fa-person-running-fast'
            break
          default:
            itemIcon = 'fas fa-dice'
        }
        targetRoll = `${targetData.name}-${origtarget}`
        break
      default:
        itemIcon = 'fas fa-dice'
        itemColor = '#015401'
    }

    const dialog = new Dialog({
      title: game.i18n.localize('GURPS.confirmRoll'),
      content: await renderTemplate('systems/gurps/templates/confirmation-roll.hbs', {
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
      }),
      buttons: {
        roll: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Roll',
          callback: () => {
            canRoll = true
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: async () => {
            await GURPS.ModifierBucket.clear()
          },
        },
      },
      default: 'roll',
    })
    await dialog.render(true)
  } else {
    canRoll = true
  }

  if (canRoll) {
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
