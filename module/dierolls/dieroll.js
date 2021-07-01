import * as Settings from '../../lib/miscellaneous-settings.js'
/*
  This is the BIG method that does the roll and prepares the chat message.
  unfortunately, it has a lot fo hard coded junk in it.
  */
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn', 
// target=skill level or -1=damage roll
export async function doRoll(actor, formula, targetmods, prefix, thing, origtarget, optionalArgs) {

  if (origtarget == 0 || isNaN(origtarget)) return;	// Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  let isTargeted = (origtarget > 0);		// Roll "against" something (true), or just a roll (false)
  let failure = false

  let chatdata = {
    prefix: prefix.trim(),
    thing: thing,
    origtarget: origtarget
  }

  // TODO Code below is duplicated in damagemessage.mjs (DamageChat) -- make sure it is updated in both places
  // Lets collect up the modifiers, they are used differently depending on the type of roll
  let modifier = 0;
  let maxtarget = null;			// If not null, then the target cannot be any higher than this.

  targetmods = await GURPS.ModifierBucket.applyMods(targetmods);		// append any global mods

  chatdata['targetmods'] = targetmods

  for (let m of targetmods) {
    modifier += m.modint;
    maxtarget = await GURPS.applyModifierDesc(actor, m.desc) || maxtarget
  }
  
  actor = actor || game.user;
  let speaker = { alias: actor.name, _id: actor.id, id: actor.id, actor: actor, token: actor.token?.id }
  //speaker = ChatMessage.getSpeaker(actor)
  let messageData = {
    user: game.user.id,
    speaker: speaker,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
  };

  let roll = null;  // Will be the Roll
  if (isTargeted) {		// This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
    let finaltarget = parseInt(origtarget) + modifier;
    if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget;
    roll = Roll.create(formula);		// The formula will always be "3d6" for a "targetted" roll
    roll.evaluate({ async: false });
    let rtotal = roll.total;
    
    chatdata['rtotal'] = rtotal
    chatdata['rolls'] = roll.dice[0].results.map(it => it.result.toString()).join(',')
    chatdata['modifier'] = modifier
    chatdata['finaltarget'] = finaltarget

    // Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
    let isCritSuccess = (rtotal <= 4) || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16);
    let isCritFailure = (rtotal >= 18) || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0);
    let margin = finaltarget - rtotal;
    let seventeen = rtotal >= 17
    failure = seventeen || margin < 0
 
    chatdata['isCritSuccess'] = isCritSuccess
    chatdata['isCritFailure'] = isCritFailure
    chatdata['margin'] = margin
    chatdata['failure'] = failure
    chatdata['seventeen'] = seventeen
    chatdata['isDraggable'] = !seventeen && margin != 0
    chatdata['otf'] = (margin >= 0 ? "+" + margin : margin) + " margin for " + thing

    if (margin > 0 && !!optionalArgs.obj && !!optionalArgs.obj.rcl) {		// if the attached obj (see handleRoll()) as Recoil information, do the additional math
      let rofrcl = Math.floor(margin / parseInt(optionalArgs.obj.rcl)) + 1;
      if (!!optionalArgs.obj.rof) {
        let rof = optionalArgs.obj.rof
        let m = rof.match(/(\d+)[×xX\*](\d+)/)   // Support shotgun RoF (3x9)
        if (!!m) 
          rofrcl = Math.min(rofrcl, parseInt(m[1]) * parseInt(m[2]))
        else
          rofrcl = Math.min(rofrcl, parseInt(rof))
      }

      chatdata['rof'] = optionalArgs.obj.rof
      chatdata['rcl'] = optionalArgs.obj.rcl
      chatdata['rofrcl'] = rofrcl
    }

    chatdata['optlabel'] = optionalArgs.text || "";

    if (game.dice3d && !game.dice3d.messageHookDisabled) {
      if (failure && optionalArgs.obj?.failotf) GURPS.PendingOTFs.unshift(optionalArgs.obj.failotf)
      if (!failure && optionalArgs.obj?.passotf) GURPS.PendingOTFs.unshift(optionalArgs.obj.passotf)
    } else {
      if (failure && optionalArgs.obj?.failotf) GURPS.executeOTF(optionalArgs.obj.failotf, optionalArgs.event)
      if (!failure && optionalArgs.obj?.passotf) GURPS.executeOTF(optionalArgs.obj.passotf, optionalArgs.event)
    }
  } else {
    // This is non-targeted, non-damage roll where the modifier is added to the roll, not the target
    // NOTE:   Damage rolls have been moved to damagemessage.js/DamageChat

    let min = 0
    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    roll = Roll.create(formula + `+${modifier}`);
    roll.evaluate({ async: false });
    let rtotal = roll.total;
    if (rtotal < min) {
      rtotal = min;
    }

    if (rtotal == 1) thing = thing.replace("points", "point");

    chatdata['rtotal'] = rtotal
     
    chatdata['rolls'] = roll.dice[0].results.map((it) => it.result).join()
    chatdata['modifier'] = modifier
  }

  let message = await renderTemplate('systems/gurps/templates/die-roll-chat-message.html', chatdata)

  messageData.content = message,
  messageData.roll = JSON.stringify(roll)

  let whoCanSeeDice = null;
  if (optionalArgs.event?.shiftKey) {
    whoCanSeeDice = [game.user.id];
    messageData.whisper = [game.user.id];
  }
  
  let isCtrl = false
  try { 
    isCtrl = !!optionalArgs.event && (game.keyboard.isCtrl(optionalArgs.event)) 
  } catch {}

  if (!!optionalArgs.blind || isCtrl || (game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_SHIFT_CLICK_BLIND) && !!optionalArgs.event?.shiftKey)) {
    messageData.whisper = ChatMessage.getWhisperRecipients("GM");
    messageData.blind = true;
  }

  messageData.sound = CONFIG.sounds.dice;
  ChatMessage.create(messageData, {});
  
  if (isTargeted && !!optionalArgs.action) {
    let users = actor.getOwners()
    let ids = users.map(it => it.id)    
    let messageData = {
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      whisper: ids
    };
    if (!failure && !!optionalArgs.action.truetext) messageData.content = optionalArgs.action.truetext
    if (failure && !!optionalArgs.action.falsetext) messageData.content = optionalArgs.action.falsetext
    if (!!messageData.content) ChatMessage.create(messageData);
  }
  return !failure
}
