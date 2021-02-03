'use strict'

import { woundModifiers } from './damage-tables.js'
import { d6ify, isNiceDiceEnabled, parseIntFrom } from '../../lib/utilities.js'
import { gspan } from '../../lib/parselink.js'

const damageLinkPattern = /^(\d+)d6?([-+]\d+)?([xX\*]\d+)? ?(\([.\d]+\))?(!)? ?([^\*]*)(\*[Cc]osts? \d+[Ff][Pp])?$/g
const swingThrustPattern = /^(SW|Sw|sw|THR|Thr|thr)([-+]\d+)?(!)? ?([^\*]*)(\*[Cc]osts? \d+[Ff][Pp])?$/g

/**
 * DamageChat is responsible for parsing a damage roll and rendering the appropriate chat message for
 * it.
 *
 * The chat message will contain a drag-and-droppable div that will be used to apply the damage to a
 * specific actor. This object takes care of binding the dragstart and dragend events to that div.
 *
 *
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
      let damageMessage = html.find('.damage-message')[0]
      if (damageMessage) {
        damageMessage.setAttribute('draggable', true)

        damageMessage.addEventListener('dragstart', (ev) => {
          $(ev.currentTarget).addClass('dragging')
          ev.dataTransfer.setDragImage(this._gurps.damageDragImage, 30, 30)
          return ev.dataTransfer.setData('text/plain', app.data.flags.transfer)
        })

        damageMessage.addEventListener('dragend', (ev) => {
          $(ev.currentTarget).removeClass('dragging')
        })
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
  async create(actor, diceText, damageType, event, overrideDiceText) {
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
      return ui.notifications.warn(`Invalid Dice formula: "${diceText}"`)
    }

    diceText = result?.groups?.roll
    diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

    let multiplier = !!result.groups.mult ? parseInt(result.groups.mult) : 1
    let divisor = !!result.groups.divisor ? parseFloat(result.groups.divisor) : 0
    let adds1 = !!result.groups.adds1 ? result.groups.adds1 : ''
    let adds2 = !!result.groups.adds2 ? result.groups.adds2 : ''
    let formula = d6ify(diceText)

    let min = 1
    let b378 = false

    if (damageType === '') damageType = 'dmg'
    if (damageType === 'cr') min = 0

    if (formula.slice(-1) === '!') {
      formula = formula.slice(0, -1)
      min = 1
    }

    let targetmods = await this._gurps.ModifierBucket.applyMods() // append any global mods
    let modifier = 0
    let maxtarget = null // If not null, then the target cannot be any higher than this.

    for (let m of targetmods) {
      modifier += m.modint
      if (!!m.desc) {
        maxtarget = this._gurps.applyModifierDesc(actor, m.desc)
      }
    }

    let roll = Roll.create(formula + `+${modifier}`)
    roll.roll()

    let diceValue = roll.results[0]
    let dicePlusAdds = diceValue
    if (adds1 && adds1 !== '') {
      let temp = adds1.startsWith('+') ? adds1.slice(1) : adds1
      let value = parseInt(temp)
      dicePlusAdds = value + dicePlusAdds
    }

    if (adds2 && adds2 !== '') {
      let temp = adds2.startsWith('+') ? adds2.slice(1) : adds2
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
    if (roll.dice[0].results.length > 1 || (adds1 && adds1 !== 0)) {
      let tempString = roll.dice[0].results.map((it) => it.result).join()
      tempString = `(${tempString})`

      if (adds1 && adds1 !== 0) {
        let x = parseInt(adds1)
        let sign = x < 0 ? '−' : '+'
        let value = Math.abs(x)
        tempString = `${tempString} ${sign} ${value}`
      }

      if (adds2 && adds2 !== 0) {
        let x = parseInt(adds2)
        let sign = x < 0 ? '-' : '+'
        let value = Math.abs(x)
        tempString = `${tempString} ${sign} ${value}`
      }
      explainLineOne = `Rolled ${tempString} = ${dicePlusAdds}.`
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

    let hasExplanation = explainLineOne || explainLineTwo

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
      if (!!overrideDiceText) overrideDiceText = `${overrideDiceText} (${divisor})`
      else diceText = `${diceText} (${divisor})`

    let contentData = {
      attacker: actor._id,
      dice: overrideDiceText || diceText, // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
      damageType: damageType,
      damageTypeText: damageType === 'dmg' ? ' ' : `'${damageType}' `,
      armorDivisor: divisor,
      damage: damage,
      modifiers: targetmods.map((it) => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      hasExplanation: hasExplanation,
      explainLineOne: explainLineOne,
      explainLineTwo: explainLineTwo,
      isB378: b378,
    }

    let html = await renderTemplate('systems/gurps/templates/damage-message.html', contentData)

    const speaker = { alias: actor.name, _id: actor._id, actor: actor }
    let messageData = {
      user: game.user._id,
      speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
    }

    if (event?.shiftKey) {
      messageData.whisper = [game.user._id]
    }

    if (!isNiceDiceEnabled()) {
      messageData.sound = CONFIG.sounds.dice
    }

    messageData['flags.transfer'] = JSON.stringify({
      type: 'damageItem',
      payload: contentData,
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
    let parsedText = linkText.replace(damageLinkPattern, 'damage~$1~$2~$3~$4~$5~$6~$7')
    if (parsedText != linkText) {
      return parsedText
    }

    // Also handle linkText of the format, "<basic-damage>+<adds>! <type>", e.g.: 'SW+2! imp'.
    return linkText.replace(swingThrustPattern, 'derived~$1~$2~$3~$4~$5')
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
    const INDEX_COST = 6

    let a = parsedText.split('~')
    let damageType = a[INDEX_TYPE].trim()
    let woundingModifier = woundModifiers[damageType]
    let costs = a[INDEX_COST];

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
        costs: costs
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
      costs: costs
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
    const INDEX_COST = 4

    let a = parsedText.split('~')
    let damageType = a[INDEX_TYPE].trim()
    let woundingModifier = woundModifiers[damageType]
    let costs = a[INDEX_COST];
    if (!!woundingModifier) {
      let action = {
        orig: linkText,
        type: 'deriveddamage',
        derivedformula: a[INDEX_BASICDAMAGE].toLowerCase(),
        formula: a[INDEX_ADDS] + a[INDEX_BANG],
        damagetype: damageType,
        costs: costs
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
      costs: costs
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
