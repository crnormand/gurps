/*
  This is the BIG method that does the roll and prepares the chat message.
  unfortunately, it has a lot fo hard coded junk in it.
  */
// formula="3d6", targetmods="[{ desc:"", mod:+-1 }]", thing="Roll vs 'thing'" or damagetype 'burn', 
// target=skill level or -1=damage roll
export async function doRoll(actor, formula, targetmods, prefix, thing, origtarget, optionalArgs) {

  if (origtarget == 0 || isNaN(origtarget)) return;	// Target == 0, so no roll.  Target == -1 for non-targetted rolls (roll, damage)
  let isTargeted = (origtarget > 0);		// Roll "against" something (true), or just a roll (false)

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
    maxtarget = GURPS.applyModifierDesc(actor, m.desc);
  }

  let roll = null;  // Will be the Roll
  if (isTargeted) {		// This is a roll "against a target number", e.g. roll vs skill/attack/attribute/etc.
    let finaltarget = parseInt(origtarget) + modifier;
    if (!!maxtarget && finaltarget > maxtarget) finaltarget = maxtarget;
    roll = Roll.create(formula);		// The formula will always be "3d6" for a "targetted" roll
    roll.roll();
    let rtotal = roll.total;

    chatdata['rtotal'] = rtotal
    chatdata['rolls'] = roll.dice[0].results.map(it => it.result.toString()).join(',')
    chatdata['modifier'] = modifier
    chatdata['finaltarget'] = finaltarget

    // Actually, you aren't allowed to roll if the target is < 3... except for active defenses.   So we will just allow it and let the GM decide.
    let isCritSuccess = (rtotal <= 4) || (rtotal == 5 && finaltarget >= 15) || (rtotal == 6 && finaltarget >= 16);
    let isCritFailure = (rtotal >= 18) || (rtotal == 17 && finaltarget <= 15) || (rtotal - finaltarget >= 10 && finaltarget > 0);

    let margin = finaltarget - rtotal;

    chatdata['isCritSuccess'] = isCritSuccess
    chatdata['isCritFailure'] = isCritFailure
    chatdata['margin'] = margin

    if (margin > 0 && !!optionalArgs.obj && !!optionalArgs.obj.rcl) {		// if the attached obj (see handleRoll()) as Recoil information, do the additional math
      let rofrcl = Math.floor(margin / parseInt(optionalArgs.obj.rcl)) + 1;
      if (!!optionalArgs.obj.rof) rofrcl = Math.min(rofrcl, parseInt(optionalArgs.obj.rof));

      chatdata['rofrcl'] = rofrcl
    }

    chatdata['optlabel'] = optionalArgs.text || "";
  } else {
    // This is non-targeted, non-damage roll where the modifier is added to the roll, not the target
    // NOTE:   Damage rolls have been moved to damagemessage.js/DamageChat

    let min = 0
    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    roll = Roll.create(formula + `+${modifier}`);
    roll.roll();
    let rtotal = roll.total;
    if (rtotal < min) {
      rtotal = min;
    }

    if (rtotal == 1) thing = thing.replace("points", "point");

    chatdata['rtotal'] = rtotal
    chatdata['rolls'] = roll.results.join(' ').replace(" + 0", "");
    chatdata['modifier'] = modifier
  }

  let message = await renderTemplate('systems/gurps/templates/die-roll-chat-message.html', chatdata)

  actor = actor || game.user;
  const speaker = { alias: actor.name, _id: actor._id, actor: actor }
  let messageData = {
    user: game.user._id,
    speaker: speaker,
    content: message,
    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
    roll: roll
  };

  let whoCanSeeDice = null;
  if (optionalArgs.event?.shiftKey) {
    whoCanSeeDice = [game.user._id];
    messageData.whisper = [game.user._id];
  }

  if (!!optionalArgs.blind) {
    messageData.whisper = ChatMessage.getWhisperRecipients("GM");
    messageData.blind = true;
  }

  messageData.sound = CONFIG.sounds.dice;
  CONFIG.ChatMessage.entityClass.create(messageData, {});
}

//  GURPS.doRoll = doRoll; YOU don't need this -- just import the function wherever it is needed.
