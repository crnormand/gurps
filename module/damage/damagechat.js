'use strict'

import { d6ify, isNiceDiceEnabled, generateUniqueId } from '../../lib/utilities.js'

/**
 * DamageChat is responsible for parsing a damage roll and rendering the appropriate chat message for
 * it.
 *
 * The chat message will contain a drag-and-droppable div that will be used to apply the damage to a
 * specific actor. This object takes care of binding the dragstart and dragend events to that div.
 */
export default class DamageChat {
  static fullRegex = /^(?<roll>\d+(?<D>d\d*)?(?<adds1>[+-]\d+)?(?<adds2>[+-]\d+)?)(?:[×xX\*](?<mult>\d+))?(?: ?\((?<divisor>-?\d+(?:\.\d+)?)\))?/

  static initSettings() {
    Hooks.on('renderChatMessage', async (app, html, msg) => {
      let isDamageChatMessage = !!html.find('.damage-chat-message').length

      if (isDamageChatMessage) {
        let transfer = JSON.parse(app.data.flags.transfer)

        // for each damage-message, set the drag-and-drop events and data
        let damageMessages = html.find('.damage-message')
        if (!!damageMessages && damageMessages.length > 0) {
          for (let index = 0; index < damageMessages.length; index++) {
            let message = damageMessages[index]

            message.setAttribute('draggable', true)
            message.addEventListener('dragstart', ev => {
              $(ev.currentTarget).addClass('dragging')
              ev.dataTransfer.setDragImage(game.GURPS.damageDragImage, 30, 30)
              let data = {
                type: 'damageItem',
                payload: transfer.payload[index],
              }
              return ev.dataTransfer.setData('text/plain', JSON.stringify(data))
            })
            message.addEventListener('dragend', ev => {
              $(ev.currentTarget).removeClass('dragging')
            })
          }
        } // end-if (!!damageMessages && damageMessages.length)

        // for the damage-all-message, set the drag-and-drop events and data
        let allDamageMessage = html.find('.damage-all-message')
        if (!!allDamageMessage && allDamageMessage.length == 1) {
          let transfer = JSON.parse(app.data.flags.transfer)
          let message = allDamageMessage[0]

          message.setAttribute('draggable', true)
          message.addEventListener('dragstart', ev => {
            $(ev.currentTarget).addClass('dragging')
            ev.dataTransfer.setDragImage(game.GURPS.damageDragImage, 30, 30)
            let data = {
              type: 'damageItem',
              payload: transfer.payload,
            }
            return ev.dataTransfer.setData('text/plain', JSON.stringify(data))
          })
          message.addEventListener('dragend', ev => {
            $(ev.currentTarget).removeClass('dragging')
          })
        }

        // If there was a target, enable the GM's apply button
        let button = html.find('button', '.apply-all')
        button.hide()
        if (!!transfer.userTarget && transfer.userTarget != null) {
          if (game.user.isGM) {
            button.show()

            button.click(ev => {
              // get actor from id
              let targetActor = game.actors.get(transfer.userTarget) // ...
              // get payload; its either the "all damage" payload or ...
              let payload = transfer.payload
              targetActor.handleDamageDrop(payload)
            })
          }
        }
      } // end-if (damageChatMessage)
    })
  }

  /**
   * Create the damage chat message.
   * @param {Actor} actor that rolled the damage.
   * @param {String} diceText such as '3d-1(2)'
   * @param {String} damageType text from DamageTables.damageTypeMap
   * @param {Event} event that triggered this action
   * @param {String} overrideDiceText ??
   */
  static async create(actor, diceText, damageType, event, overrideDiceText, tokenNames) {
    let message = new DamageChat()

    const targetmods = await game.GURPS.ModifierBucket.applyMods() // append any global mods

    let dice = message._getDiceData(diceText, damageType, targetmods, overrideDiceText)

    if (!tokenNames) tokenNames = []
    if (tokenNames.length == 0) tokenNames.push('')

    let draggableData = []
    await tokenNames.forEach(async tokenName => {
      let data = await message._createDraggableSection(actor, dice, tokenName, targetmods)
      draggableData.push(data)
    })

    message._createChatMessage(actor, dice, targetmods, draggableData, event)

    // Resolve any modifier descriptors (such as *Costs 1FP)
    targetmods
      .filter(it => !!it.desc)
      .map(it => it.desc)
      .forEach(it => game.GURPS.applyModifierDesc(actor, it))
  }

  /**
   * This method is all about interpreting the die roll text.
   *
   * Returns {
   *    formula: String, -- Foundry Dice formula
   *    modifier: num, -- sum of modifiers
   *    diceText: String, -- GURPS die text
   *    multiplier: num, -- any multiplier (1 if none)
   *    divisor: num, -- any armor divisor (0 if none)
   *    adds1: num, -- first add
   *    adds2: num, -- second add
   *    min: num, -- minimum value of the die roll (0, 1)
   * }
   * @param {String} diceText
   * @param {*} damageType
   * @param {*} overrideDiceText
   */
  _getDiceData(diceText, damageType, targetmods, overrideDiceText) {
    // format for diceText:
    //
    // '<dice>d+<adds1>+<adds2>x<multiplier>(<divisor>)'
    //
    // - Multipliers are integers that appear after a multiplication sign (x, X, *, or ×).
    //
    // - Armor divisors are decimal numbers in parentheses: (2), (5), (0.2), (0.5). (Accept
    //    an optional space between the armor divisor and the preceding characters.)
    //
    // Examples: 3d, 1d-1, 3dx5, 3d-1x5, 2d(2), 5d-1(0.2), 3dx2(5), 4d-1x4(5).
    //
    // Added support for a second add, such as: 1d-2+3 -- this was to support damage expressed
    // using basic damage syntax, such as "sw+3" (which could translate to '1d-2+3', for exmaple).

    let result = DamageChat.fullRegex.exec(diceText)

    if (!result) {
      ui.notifications.warn(`Invalid Dice formula: "${diceText}"`)
      return null
    }

    diceText = result.groups.roll
    diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

    let multiplier = !!result.groups.mult ? parseInt(result.groups.mult) : 1
    let divisor = !!result.groups.divisor ? parseFloat(result.groups.divisor) : 0

    let adds1 = 0
    let temp = !!result.groups.adds1 ? result.groups.adds1 : ''
    if (!!temp && temp !== '') {
      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds1 = parseInt(temp)
    }

    let adds2 = 0
    temp = !!result.groups.adds2 ? result.groups.adds2 : ''
    if (!!temp && temp !== '') {
      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds2 = parseInt(temp)
    }

    let formula = diceText
    let verb = ''
    if (!!result.groups.D) {
      verb = 'Rolling '
      if (result.groups.D === 'd') formula = d6ify(diceText) // GURPS dice (assume 6)
    }
    let displayText = overrideDiceText || diceText // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
    let min = 1

    if (damageType === '') damageType = 'dmg'
    if (damageType === 'cr') min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let modifier = 0
    for (let m of targetmods) {
      modifier += m.modint
    }
    let additionalText = ''
    if (multiplier > 1) {
      additionalText += `×${multiplier}`
    }

    if (divisor != 0) {
      additionalText += ` (${divisor})`
    }

    let diceData = {
      formula: formula,
      verb: verb, // Rolling (if we have dice) or nothing
      modifier: modifier,
      diceText: displayText + additionalText,
      damageType: damageType,
      multiplier: multiplier,
      divisor: divisor,
      adds1: adds1,
      adds2: adds2,
      min: min,
    }
    console.log(diceData)
    return diceData
  }

  /**
   * This method creates the content of each draggable section with
   * damage rolled for a single target.
   * @param {*} actor
   * @param {*} diceData
   * @param {*} tokenName
   * @param {*} targetmods
   */
  async _createDraggableSection(actor, diceData, tokenName, targetmods) {
    let roll = Roll.create(diceData.formula + `+${diceData.modifier}`)
    roll.roll()

    let diceValue = roll.results[0]
    let dicePlusAdds = diceValue + diceData.adds1 + diceData.adds2

    let rollTotal = roll.total

    let b378 = false
    if (rollTotal < diceData.min) {
      rollTotal = diceData.min
      if (diceData.damageType !== 'cr') {
        b378 = true
      }
    }

    let damage = rollTotal * diceData.multiplier

    let explainLineOne = null
    if ((roll.dice.length > 0 && roll.dice[0].results.length > 1) || diceData.adds1 !== 0) {
      let tempString = ''
      if (roll.dice.length > 0) {
        tempString = roll.dice[0].results.map(it => it.result).join()
        tempString = `Rolled (${tempString})`
      } else {
        tempString = diceValue
      }

      if (diceData.adds1 !== 0) {
        let sign = diceData.adds1 < 0 ? '−' : '+'
        let value = Math.abs(diceData.adds1)
        tempString = `${tempString} ${sign} ${value}`
      }

      if (diceData.adds2 !== 0) {
        let sign = diceData.adds2 < 0 ? '-' : '+'
        let value = Math.abs(diceData.adds2)
        tempString = `${tempString} ${sign} ${value}`
      }
      explainLineOne = `${tempString} = ${dicePlusAdds}.`
    }

    let explainLineTwo = null
    let sign = diceData.modifier < 0 ? '−' : '+'
    let value = Math.abs(diceData.modifier)

    if (targetmods.length > 0 && diceData.multiplier > 1) {
      explainLineTwo = `Total = (${dicePlusAdds} ${sign} ${value}) × ${diceData.multiplier} = ${damage}.`
    } else if (targetmods.length > 0) {
      explainLineTwo = `Total = ${dicePlusAdds} ${sign} ${value} = ${damage}.`
    } else if (diceData.multiplier > 1) {
      explainLineTwo = `Total = ${dicePlusAdds} × ${diceData.multiplier} = ${damage}.`
    }

    let hasExplanation = explainLineOne || explainLineTwo

    if (hasExplanation && b378) {
      if (explainLineTwo) explainLineTwo = `${explainLineTwo}*`
      else explainLineOne = `${explainLineOne}*`
    }

    let contentData = {
      id: generateUniqueId(),
      attacker: actor._id,
      dice: diceData.diceText,
      damageType: diceData.damageType,
      damageTypeText: diceData.damageType === 'dmg' ? ' ' : `'${diceData.damageType}' `,
      armorDivisor: diceData.divisor,
      damage: damage,
      hasExplanation: hasExplanation,
      explainLineOne: explainLineOne,
      explainLineTwo: explainLineTwo,
      isB378: b378,
      roll: roll,
      target: tokenName,
    }
    console.log(contentData)
    return contentData
  }

  async _createChatMessage(actor, diceData, targetmods, draggableData, event) {
    let userTarget = null
    if (!!game.user.targets.size) {
      userTarget = game.user.targets.values().next().value
    }

    const damageType = diceData.damageType
    let html = await renderTemplate('systems/gurps/templates/damage-message-wrapper.html', {
      draggableData: draggableData,
      verb: diceData.verb,
      dice: diceData.diceText,
      damageTypeText: damageType === 'dmg' ? ' ' : `'${damageType}' `,
      modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      userTarget: userTarget,
    })

    const speaker = { alias: actor.name, _id: actor._id, actor: actor }
    let messageData = {
      user: game.user._id,
      speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: draggableData[0].roll,
    }

    if (event?.shiftKey) {
      messageData.whisper = [game.user._id]
    }

    messageData['flags.transfer'] = JSON.stringify({
      type: 'damageItem',
      payload: draggableData,
      userTarget: !!userTarget ? userTarget.actor.id : null,
    })

    if (isNiceDiceEnabled()) {
      let rolls = draggableData.map(d => d.roll)
      let throws = []
      let dice = []
      rolls.shift() // The first roll will be handled by DSN's chat handler... the rest we will manually roll
      rolls.forEach(r => {
        r.dice.forEach(d => {
          let type = 'd' + d.faces
          d.results.forEach(s =>
            dice.push({
              result: s.result,
              resultLabel: s.result,
              type: type,
              vectors: [],
              options: {},
            })
          )
        })
      })
      throws.push({ dice: dice })
      if (dice.length > 0) {
        // The user made a "multi-damage" roll... let them see the dice!
        game.dice3d.show({ throws: throws })
      }
    } else {
      messageData.sound = CONFIG.sounds.dice
    }
    CONFIG.ChatMessage.entityClass.create(messageData).then(arg => {
      console.log(arg)
      let messageId = arg.data._id // 'qHz1QQuzpJiavH3V'
      $(`[data-message-id='${messageId}']`).click(ev => game.GURPS.handleOnPdf(ev))
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
