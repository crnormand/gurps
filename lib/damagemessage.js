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
    // Handle multipliers on the damage dice:
    // The diceText will be of the form, "<dice>d<adds>x<multiplier>".
    // Be very permissive and accept 'x', 'X', '*', and '×' (multiplication symbol).
    let multiplier = 1;
    let regex = /^\S+([x×\*X]\d+)$/

    if (diceText.match(regex)) {
      let result = regex.exec(diceText)
      console.log(result[1])
      multiplier = parseInt(result[1].slice(1))
      diceText = diceText.replace(result[1], '') // remove multipler from diceText
    }

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

    // damageType may have an armor divisor on it -- check for that and parse out.
    // armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5)
    let divisor = 0
    let divisorRegex = /^(\((\d+(?:.\d+)?)\)) \S+$/
    if (damageType.match(divisorRegex)) {
      let result = divisorRegex.exec(damageType)
      console.log(result[1])
      divisor = parseFloat(result[2])
      damageType = damageType.replace(result[1], '').trim()
    }

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

    rtotal = rtotal * multiplier

    if (multiplier > 1) diceText = `${diceText}×${multiplier}`
    if (divisor > 0) diceText = `${diceText} (${divisor})`

    let contentData = {
      dice: overrideDiceText || diceText,		// overrideDiceText used when actual formula isn't "pretty" SW+2 vs 1d6+1+2
      damage: rtotal,
      damageType: damageType,
      divisor: divisor,
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