import * as Settings from '../../lib/miscellaneous-settings.js'
/*
  This is the BIG method that does the roll and prepares the chat message.
  unfortunately, it has a lot fo hard coded junk in it.
  */
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn',
// target=skill level or -1=damage roll
export async function doRoll({
  actor,
  formula = '3d6',
  targetmods = [],
  prefix = '',
  thing = '',
  chatthing = '',
  origtarget = -1,
  optionalArgs = {},
}) {
  if (origtarget == 0 || isNaN(origtarget)) return // Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  let isTargeted = origtarget > 0 // Roll "against" something (true), or just a roll (false)
  let failure = false

  let chatdata = {
    prefix: prefix.trim(),
    chatthing: chatthing,
    thing: thing,
    origtarget: origtarget,
  }

  // TODO Code below is duplicated in damagemessage.mjs (DamageChat) -- make sure it is updated in both places
  // Lets collect up the modifiers, they are used differently depending on the type of roll
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
