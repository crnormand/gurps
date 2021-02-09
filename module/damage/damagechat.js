'use strict'

import { woundModifiers } from './damage-tables.js'
import { d6ify, isNiceDiceEnabled, generateUniqueId } from '../../lib/utilities.js'
import { gspan } from '../../lib/parselink.js'

const damageLinkPattern = /^(\d+)d6?([-+]\d+)?([xX\*]\d+)? ?(\([.\d]+\))?(!)? ?(.*)$/g
const swingThrustPattern = /^(SW|Sw|sw|THR|Thr|thr)([-+]\d+)?(!)?( .*)?$/g

/**
 * DamageChat is responsible for parsing a damage roll and rendering the appropriate chat message for
 * it.
 *
 * The chat message will contain a drag-and-droppable div that will be used to apply the damage to a
 * specific actor. This object takes care of binding the dragstart and dragend events to that div.
 */
export default class DamageChat {
  static basicRegex = /^(?<basic>SW|Sw|sw|THR|Thr|thr)[^A-Za-z]/
  static fullRegex = /^(?<roll>\d+d(?<adds1>[+-]\d+)?(?<adds2>[+-]\d+)?)(?:[×xX\*](?<mult>\d+))?(?: ?\((?<divisor>\d+(?:\.\d+)?)\))?/

  constructor(GURPS) {
    this.setup()
    this._gurps = GURPS
  }

  setup() {
    Hooks.on('renderChatMessage', async (app, html, msg) => {
      let damageMessages = html.find('.damage-message')
      if (!!damageMessages && damageMessages.length > 0) {
        let transfer = JSON.parse(app.data.flags.transfer)
        for (let index = 0; index < damageMessages.length; index++) {
          let message = damageMessages[index]

          message.setAttribute('draggable', true)
          message.addEventListener('dragstart', (ev) => {
            $(ev.currentTarget).addClass('dragging')
            ev.dataTransfer.setDragImage(this._gurps.damageDragImage, 30, 30)
            let data = {
              type: 'damageItem',
              payload: transfer.payload[index],
            }
            return ev.dataTransfer.setData('text/plain', JSON.stringify(data))
          })
          message.addEventListener('dragend', (ev) => {
            $(ev.currentTarget).removeClass('dragging')
          })
        }
      }
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
  async create(actor, diceText, damageType, event, overrideDiceText, tokenNames) {
    const targetmods = await this._gurps.ModifierBucket.applyMods() // append any global mods

    let dice = this._getDiceData(diceText, damageType, targetmods, overrideDiceText)

    if (!tokenNames) tokenNames = []
    if (tokenNames.length == 0) tokenNames.push('')

    let draggableData = []
    await tokenNames.forEach(async (tokenName) => {
      let data = await this._createDraggableSection(actor, dice, tokenName, targetmods)
      draggableData.push(data)
    })

    this._createChatMessage(actor, dice.diceText, dice.damageType, targetmods, draggableData, event)

    // Resolve any modifier descriptors (such as *Costs 1FP)
    targetmods.filter(it => !!it.desc).map(it => it.desc).forEach(it => this._gurps.applyModifierDesc(actor, it))
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
    // First check for basic damage syntax, such as thr+3, sw-1, etc...
    let result = DamageChat.basicRegex.exec(diceText)
    if (!!result) {
      let basicType = (result?.groups?.basic).toLowerCase()

      if (basicType === 'sw') {
        overrideDiceText = diceText
        diceText = diceText.replace(/^(SW|Sw|sw)/, actor.data.data.swing)
      }

      if (basicType === 'thr') {
        overrideDiceText = diceText
        diceText = diceText.replace(/^(THR|Thr|thr)/, actor.data.data.thrust)
      }
    }

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

    result = DamageChat.fullRegex.exec(diceText)

    if (!result) {
      ui.notifications.warn(`Invalid Dice formula: "${diceText}"`)
      return null
    }

    diceText = result?.groups?.roll
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

    let formula = d6ify(diceText)
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
    if (multiplier > 1) {
      if (!!overrideDiceText) {
        overrideDiceText = `${overrideDiceText}×${multiplier}`
      } else {
        diceText = `${diceText}×${multiplier}`
      }
    }

    if (divisor > 0) {
      if (!!overrideDiceText) {
        overrideDiceText = `${overrideDiceText} (${divisor})`
      } else {
        diceText = `${diceText} (${divisor})`
      }
    }

    let diceData = {
      formula: formula,
      modifier: modifier,
      // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
      diceText: diceText || overrideDiceText,
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
    if (roll.dice[0].results.length > 1 || (diceData.adds1 !== 0)) {
      let tempString = roll.dice[0].results.map((it) => it.result).join()
      tempString = `(${tempString})`

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
      explainLineOne = `Rolled ${tempString} = ${dicePlusAdds}.`
    }

    let explainLineTwo = null
    {
      let sign = diceData.modifier < 0 ? '−' : '+'
      let value = Math.abs(diceData.modifier)

      if (targetmods.length > 0 && diceData.multiplier > 1) {
        explainLineTwo = `Total = (${dicePlusAdds} ${sign} ${value}) × ${diceData.multiplier} = ${damage}.`
      } else if (targetmods.length > 0) {
        explainLineTwo = `Total = ${dicePlusAdds} ${sign} ${value} = ${damage}.`
      } else if (diceData.multiplier > 1) {
        explainLineTwo = `Total = ${dicePlusAdds} × ${diceData.multiplier} = ${damage}.`
      }
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
      target: tokenName
    }
    console.log(contentData)
    return contentData
  }

  async _createChatMessage(actor, diceText, damageType, targetmods, draggableData, event) {
    let html = await renderTemplate('systems/gurps/templates/damage-message-wrapper.html', {
      draggableData: draggableData,
      dice: diceText,
      damageTypeText: damageType === 'dmg' ? ' ' : `'${damageType}' `,
      modifiers: targetmods.map((it) => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
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

    if (!isNiceDiceEnabled()) {
      messageData.sound = CONFIG.sounds.dice
    }

    messageData['flags.transfer'] = JSON.stringify({
      type: 'damageItem',
      payload: draggableData,
    })

    CONFIG.ChatMessage.entityClass.create(messageData).then((arg) => {
      console.log(arg)
      let messageId = arg.data._id // 'qHz1QQuzpJiavH3V'
      $(`[data-message-id='${messageId}']`).click((ev) => this._gurps.handleOnPdf(ev))
    })
  }

  /**
   * Try to parse the link text as a damage roll.
   *
   * @param {String} linkText
   * @returns {String} the original linkText if not recognized; otherwise a string of
   *    the form "$1~$2~$3~$4~$5~$6", where each $n is a component of the damage roll.
   *    For example, '2d-1x10(2)! cut' would be "2~-1~x10~(2)~!~cut".
   */

  parseLink(linkText) {
    let parsedText = linkText.replace(damageLinkPattern, 'damage~$1~$2~$3~$4~$5~$6')
    if (parsedText != linkText) {
      return parsedText
    }

    // Also handle linkText of the format, "<basic-damage>+<adds>! <type>", e.g.: 'SW+2! imp'.
    return linkText.replace(swingThrustPattern, 'derived~$1~$2~$3~$4')
  }

  /**
   * Given pre-parsed text in the same format as produced by the parseLink(text) function,
   * create and return an Action object.
   *
   * @param {String} linkText the original link text.
   * @param {String} parsedText  a string of the form "$1~$2~$3~$4~$5~$6", where each $n is
   *    a component of the damage roll.
   * @returns {JSON} An JSON object that can be processed by the GURPS.performAction()
   *    function.
   */
  createAction(linkText, parsedText) {
    let type = parsedText.split('~')[0]
    let dataString = parsedText.substr(type.length + 1)
    if (type === 'damage') return this._createDamageAction(linkText, dataString)

    if (type === 'derived') return this._createDerivedAction(linkText, dataString)

    // this should never happen
    return ui.notifications.warn(`Unexpected error processing link: "${linkText}" (${parsedText})`)
  }

  _createDamageAction(linkText, parsedText) {
    const INDEX_DICE = 0
    const INDEX_ADDS = 1
    const INDEX_MULTIPLIER = 2
    const INDEX_DIVISOR = 3
    const INDEX_BANG = 4
    const INDEX_TYPE = 5

    let a = parsedText.split('~')
    let damageType = a[INDEX_TYPE].trim()
    let woundingModifier = woundModifiers[damageType]

    // Not one of the recognized damage types. Ignore Armor divisor, but allow multiplier.
    // Must convert to '*' for Foundry.
    if (!woundingModifier) {
      let multiplier = a[INDEX_MULTIPLIER]
      if (!!multiplier && 'Xx'.includes(multiplier[0])) {
        multiplier = '*' + multiplier.substr(1)
      }

      let action = {
        orig: linkText,
        type: 'roll',
        formula: a[INDEX_DICE] + 'd' + a[INDEX_ADDS] + multiplier + a[INDEX_BANG],
        desc: damageType, // Action description
      }

      return {
        text: gspan(linkText, action),
        action: action,
      }
    }

    // Damage roll 1d+2 cut.  Not allowed an action desc (?).
    let action = {
      orig: linkText,
      type: 'damage',
      formula: a[INDEX_DICE] + 'd' + a[INDEX_ADDS] + a[INDEX_MULTIPLIER] + a[INDEX_DIVISOR] + a[INDEX_BANG],
      damagetype: damageType,
    }

    return {
      text: gspan(linkText, action),
      action: action,
    }
  }

  _createDerivedAction(linkText, parsedText) {
    const INDEX_BASICDAMAGE = 0
    const INDEX_ADDS = 1
    const INDEX_BANG = 2
    const INDEX_TYPE = 3

    let a = parsedText.split('~')
    let damageType = a[INDEX_TYPE].trim()
    let woundingModifier = woundModifiers[damageType]
    if (!!woundingModifier) {
      let action = {
        orig: linkText,
        type: 'deriveddamage',
        derivedformula: a[INDEX_BASICDAMAGE].toLowerCase(),
        formula: a[INDEX_ADDS] + a[INDEX_BANG],
        damagetype: damageType,
      }
      return {
        text: gspan(linkText, action),
        action: action,
      }
    }

    let action = {
      orig: linkText,
      type: 'derivedroll',
      derivedformula: a[INDEX_BASICDAMAGE].toLowerCase(),
      formula: a[INDEX_ADDS] + a[INDEX_BANG],
      desc: damageType,
    }
    return {
      text: gspan(linkText, action),
      action: action,
    }
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
