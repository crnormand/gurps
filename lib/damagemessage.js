'use strict'

import { d6ify, isNiceDiceEnabled } from './utilities.js'

export default class DamageChat {
  constructor() {
    this.setup()
  }

  setup() {
    let self = this

    Hooks.on('renderChatMessage', (app, html, msg) => {
      let damageMessage = html.find(".damage-message")[0]
      if (damageMessage) {
        damageMessage.setAttribute("draggable", true)

        damageMessage.addEventListener('dragstart', ev => {
          return ev.dataTransfer.setData("text/plain", app.data.flags.transfer)
        })
      }
    })
  }

  async create(actor, diceText, damageType, overrideDiceText) {
    let formula = d6ify(diceText)

    let targetmods = await GURPS.ModifierBucket.applyMods([])		// append any global mods
    let modifier = 0
    let maxtarget = null			// If not null, then the target cannot be any higher than this.

    if (targetmods.length > 0) {
      for (let m of targetmods) {
        modifier += parseInt(m.mod);
        if (!!m.desc) {
          maxtarget = GURPS.applyModifierDesc(actor, m.desc);
        }
      }
    }

    let min = 1
    let b378 = false

    if (damageType === 'cr') min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let roll = new Roll(formula + `+${modifier}`)
    roll.roll()
    let rtotal = roll.total
    if (rtotal < min) {
      rtotal = min
      if (damageType !== 'cr') b378 = true
    }

    let contentData = {
      dice: overrideDiceText || diceText,		// overrideDicxeText used when actual formula isn't "pretty" SW+2 vs 1d6+1+2
      damage: rtotal,
      damageType: damageType,
      modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      isB378: b378,
      attacker: actor._id
    }
    let html = await
      renderTemplate('systems/gurps/templates/damage/damage-message.html', contentData)

    const speaker = { alias: actor.name, _id: actor._id }
    let messageData = {
      user: game.user._id,
      speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll
    };

    if (!isNiceDiceEnabled()) {
      messageData.sound = CONFIG.sounds.dice
    }

    messageData["flags.transfer"] = JSON.stringify(
      {
        type: 'damageItem',
        payload: contentData
      }
    )

    CONFIG.ChatMessage.entityClass.create(messageData);
  }
}

/*
let transfer = {
  dice: '3d+5',
  modifiers: [
    '+2 damage (Strong Attack)',
    '+2 damage (Mighty Blow) *Cost 1FP'
  ]
  damage: 21,
  damageType: 'cut',
  isB378: false
}
*/