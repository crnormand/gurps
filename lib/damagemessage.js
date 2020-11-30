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
    // format for diceText:
    // "<dice>d+<adds>x<multiplier>(<divisor>)"
    // Multipliers are integers that appear after a multiplication sign (x, X, *, or ×).
    // Armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5).
    // Examples: 3d, 1d-1, 3dx5, 3d-1x5, 2d(2), 5d-1(0.2), 3dx2(5), 4d-1x4(5).
    let regex = /^(?<roll>\d+d(?<adds>[+-−]\d+)?)(?:[×xX\*](?<mult>\d+))?(?:\((?<divisor>\d+(?:\.\d+)?)\))?$/

    let result = regex.exec(diceText)

    diceText = result.groups.roll
    diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

    let multiplier = (!!result.groups.mult) ? parseInt(result.groups.mult) : 1
    let divisor = (!!result.groups.divisor) ? parseFloat(result.groups.divisor) : 0
    let adds = (!!result.groups.adds) ? result.groups.adds : ''
    let formula = d6ify(diceText)

    let min = 1
    let b378 = false

    if (damageType === '') damageType = 'dmg'
    if (damageType === 'cr') min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let targetmods = await GURPS.ModifierBucket.applyMods([])		// append any global mods
    let modifier = 0
    let maxtarget = null			// If not null, then the target cannot be any higher than this.

    for (let m of targetmods) {
      modifier += parseInt(m.mod);
      if (!!m.desc) {
        maxtarget = GURPS.applyModifierDesc(actor, m.desc);
      }
    }

    let roll = new Roll(formula + `+${modifier}`)
    roll.roll()
    let diceValue = roll.results[0]
    let rawTotal = diceValue + parseInt(adds)
    let rtotal = roll.total
    if (rtotal < min) {
      rtotal = min
      if (damageType !== 'cr') b378 = true
    }

    rtotal = rtotal * multiplier

    if (multiplier > 1) {
      if (!!overrideDiceText) {
        overrideDiceText = `${overrideDiceText}×${multiplier}`
      } else {
        diceText = `${diceText}×${multiplier}`
      }
    }

    if (divisor > 0)
      if (!!overrideDiceText)
        overrideDiceText = `${overrideDiceText} (${divisor})`
      else
        diceText = `${diceText} (${divisor})`

    let contentData = {
      dice: overrideDiceText || diceText,		// overrideDiceText used when actual formula isn't "pretty" SW+2 vs 1d6+1+2
      diceValue: diceValue,
      adds: adds,
      rawTotal: rawTotal,
      multiplier: multiplier === 1 ? null : multiplier,
      damage: rtotal,
      damageType: damageType === 'dmg' ? ' ' : `'${damageType}' `,
      armorDivisor: divisor,
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

    CONFIG.ChatMessage.entityClass.create(messageData).then((arg) => {
      console.log(arg)
      let messageId = arg.data._id // "qHz1QQuzpJiavH3V"
      $(`[data-message-id="${messageId}"]`).click((ev) => game.GURPS.handleOnPdf(ev))
    })
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