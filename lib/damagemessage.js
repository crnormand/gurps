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

  async create(actor, diceText, damageType, event, overrideDiceText) {
    // format for diceText:
    // "<dice>d+<adds>x<multiplier>(<divisor>)"
    // Multipliers are integers that appear after a multiplication sign (x, X, *, or ×).
    // Armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5).
    // Examples: 3d, 1d-1, 3dx5, 3d-1x5, 2d(2), 5d-1(0.2), 3dx2(5), 4d-1x4(5).
    //    let regex = /^(?<roll>\d+d(?<adds>[+-−]\d+)?)(?:[×xX\*](?<mult>\d+))?(?:\((?<divisor>\d+(?:\.\d+)?)\))?$/
    // CRN I had to re-instate the space before an armor divisor, because that is how CGA exports it
    let regex = /^(?<roll>\d+d(?<adds>[+-]\d+)?)(?:[×xX\*](?<mult>\d+))?(?: ?\((?<divisor>\d+(?:\.\d+)?)\))?$/

    let result = regex.exec(diceText)

    diceText = result?.groups?.roll
    if (!diceText) return ui.notifications.warn("No Dice formula to roll");
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

    let targetmods = await GURPS.ModifierBucket.applyMods()		// append any global mods
    let modifier = 0
    let maxtarget = null			// If not null, then the target cannot be any higher than this.

    for (let m of targetmods) {
      modifier += m.modint;
      if (!!m.desc) {
        maxtarget = GURPS.applyModifierDesc(actor, m.desc);
      }
    }

    let roll = Roll.create(formula + `+${modifier}`)
    roll.roll()

    let diceValue = roll.results[0]
    let dicePlusAdds = diceValue;
    if (adds && adds !== '') {
      let temp = (adds.startsWith('+')) ? adds.slice(1) : adds
      let value = parseInt(temp)
      dicePlusAdds = value + dicePlusAdds
    }

    let rollTotal = roll.total
    if (rollTotal < min) {
      rollTotal = min
      if (damageType !== 'cr') b378 = true
    }

    let damage = rollTotal * multiplier

    let explainLineOne = null
    if (adds && adds !== 0) {
      let x = parseInt(adds)
      let sign = x < 0 ? '−' : '+'
      let value = Math.abs(x)
      explainLineOne = `Rolled (${diceValue}) ${sign} ${value} = ${dicePlusAdds}.`
    }

    let explainLineTwo = null
    {
      let sign = modifier < 0 ? '−' : '+'
      let value = Math.abs(modifier)

      if (targetmods.length > 0 && multiplier > 1) {
        explainLineTwo = `Total = (${dicePlusAdds} ${sign} ${value}) × ${multiplier} = ${damage}.`
      } else if (targetmods.length > 0) {
        explainLineTwo = `Total = ${dicePlusAdds} ${sign} ${value} = ${damage}.`
      } else if (multiplier > 1) {
        explainLineTwo = `Total = ${dicePlusAdds} × ${multiplier} = ${damage}.`
      }
    }

    let hasExplanation = (explainLineOne || explainLineTwo)

    if (hasExplanation && b378) {
      if (explainLineTwo) explainLineTwo = `${explainLineTwo}*`
      else explainLineOne = `${explainLineOne}*`
    }

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
      attacker: actor._id,
      dice: overrideDiceText || diceText,		// overrideDiceText used when actual formula isn't "pretty" SW+2 vs 1d6+1+2
      damageType: damageType,
      damageTypeText: damageType === 'dmg' ? ' ' : `'${damageType}' `,
      armorDivisor: divisor,
      damage: damage,
      modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      hasExplanation: hasExplanation,
      explainLineOne: explainLineOne,
      explainLineTwo: explainLineTwo,
      isB378: b378
    }

    let html = await
      renderTemplate('systems/gurps/templates/damage-message.html', contentData)

    const speaker = { alias: actor.name, _id: actor._id }
    let messageData = {
      user: game.user._id,
      speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll
    };

		if (event.shiftKey) {
			messageData.whisper = [game.user._id];
		}

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