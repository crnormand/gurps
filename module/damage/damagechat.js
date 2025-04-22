'use strict'

import * as Settings from '../../lib/miscellaneous-settings.js'
import { d6ify, generateUniqueId, isNiceDiceEnabled, makeElementDraggable } from '../../lib/utilities.js'
import { GurpsActor } from '../actor/actor.js'
import { addBucketToDamage } from '../dierolls/dieroll.js'
import selectTarget from '../select-target.js'

/**
 * DamageChat is responsible for parsing a damage roll and rendering the appropriate chat message for
 * it.
 *
 * The chat message will contain a drag-and-droppable div that will be used to apply the damage to a
 * specific actor. This object takes care of binding the dragstart and dragend events to that div.
 */
export default class DamageChat {
  /**
   * @param {{ data: { flags: { transfer: string; }; }; }} app
   * @param {JQuery<HTMLElement>} html
   * @param {any} _msg
   */
  static async _renderDamageChat(app, html, _msg) {
    if (!html.find('.damage-chat-message').length) return // this is not a damage chat message

    let transfer = JSON.parse(app.flags.transfer)

    // for each damage-message, set the drag-and-drop events and data
    let damageMessages = html.find('.damage-message')
    if (!!damageMessages && damageMessages.length > 0) {
      for (let index = 0; index < damageMessages.length; index++) {
        let message = damageMessages[index]
        let payload = transfer.payload[index]
        makeElementDraggable(message, 'damageItem', 'dragging', payload, GURPS.damageDragImage, [30, 30])
      }
    } // end-if (!!damageMessages && damageMessages.length)

    // for the damage-all-message, set the drag-and-drop events and data
    let allDamageMessage = html.find('.damage-all-message')
    if (!!allDamageMessage && allDamageMessage.length == 1) {
      let transfer = JSON.parse(app.flags.transfer)
      let message = allDamageMessage[0]

      makeElementDraggable(message, 'damageItem', 'dragging', transfer.payload, GURPS.damageDragImage, [30, 30])
    }

    // If there was a target, enable the GM's apply button
    let button = html.find(':button.apply-all')
    button.hide()
    if (!!transfer.userTarget && transfer.userTarget != null) {
      if (game.user.isGM) {
        button.show()

        button.on('click', ev => {
          // get actor from id
          let token = canvas.tokens?.get(transfer.userTarget) // ...
          // get payload; its either the "all damage" payload or ...
          let actor = token?.actor
          if (!!actor) actor.handleDamageDrop(transfer.payload)
          else ui.notifications?.warn('Unable to find token with ID:' + transfer.userTarget)
        })
      }
    }
  }

  /**
   * @param {Canvas} canvas
   * @param {{ type: string; x: number; y: number; payload: any; }} dropData
   */
  static async _dropCanvasData(canvas, dropData) {
    const actor = game.users.get(dropData.actorid)

    switch (dropData.type) {
      case 'damageItem':
        await DamageChat._calculateAndSelectTargets(canvas, dropData)
        break
      case 'Item':
        await actor.handleItemDrop(dropData)
        break
      case 'equipment':
        await actor.handleEquipmentDrop(dropData)
        break
    }
    return false
  }

  static init() {
    Hooks.on('renderChatMessage', DamageChat._renderDamageChat)
    Hooks.on('dropCanvasData', DamageChat._dropCanvasData)
  }

  /**
   * Create the damage chat message.
   * @param {GurpsActor|User} actor that rolled the damage.
   * @param {String} diceText such as '3d-1(2)'
   * @param {String} damageType text from DamageTables.damageTypeMap
   * @param {JQuery.Event|null} event that triggered this action
   * @param {String|null} overrideDiceText ??
   * @param {String[]|undefined} tokenNames
   * @param {String|null} extdamagetype
   * @param {string|null} hitlocation
   * @returns {Promise<void>}
   */
  static async create(
    actor,
    diceText,
    damageType,
    event,
    overrideDiceText,
    tokenNames,
    extdamagetype = null,
    hitlocation = null
  ) {
    let message = new DamageChat()

    let diceFormula = addBucketToDamage(diceText, true) // run before applyMods()
    const targetmods = GURPS.ModifierBucket.applyMods() // append any global mods

    const taggedSettings = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
    let diceMods
    if (taggedSettings.autoAdd) {
      diceMods = []
    } else {
      diceFormula = diceText
      diceMods = targetmods
    }

    let dice = message._getDiceData(diceFormula, damageType, diceMods, overrideDiceText, extdamagetype)
    if (dice == null) return

    if (!tokenNames) tokenNames = []
    if (!!event && event.data?.repeat > 1) for (let i = 0; i < event.data.repeat; i++) tokenNames.push('' + i)

    if (tokenNames.length == 0) tokenNames.push('')

    let draggableData = []
    for (const tokenName of tokenNames) {
      let data = await message._createDraggableSection(actor, dice, tokenName, targetmods, hitlocation)
      draggableData.push(data)
    }

    // TODO add hitlocation to Chat message (e.g, something like 'Rolling 3d cut damage to Neck')
    message._createChatMessage(actor, dice, targetmods, draggableData, event)

    // Resolve any modifier descriptors (such as *Costs 1FP)
    targetmods
      .filter(it => !!it.desc)
      .map(it => it.desc)
      .forEach(it => GURPS.applyModifierDesc(actor, it))
  }

  /**
   * This method is all about interpreting the die roll text.
   *
   *  @param {string} originalDiceText
   *  @param {string} damageType
   *  @param {string|null} overrideDiceText
   *  @param {string|null} extdamagetype
   *  @param {Modifier[]} targetmods
   *  @returns {diceData|null}
   */
  _getDiceData(originalDiceText, damageType, targetmods, overrideDiceText, extdamagetype) {
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

    let result = DamageChat.fullRegex.exec(originalDiceText)

    if (!result) {
      ui.notifications?.warn(`Invalid Dice formula: "${originalDiceText}"`)
      return null
    }

    let diceText = result.groups?.roll || ''

    if (originalDiceText.slice(-1) === '!') diceText = diceText + '!'
    diceText = diceText.replace('−', '-') // replace minus (&#8722;) with hyphen

    let multiplier = !!result.groups?.mult ? parseFloat(result.groups.mult) : 1
    let divisor = !!result.groups?.divisor ? parseFloat(result.groups.divisor) : 0

    let adds1 = 0
    let temp = !!result.groups?.adds1 ? result.groups.adds1 : ''
    if (!!temp && temp !== '') {
      let m = temp.match(/([+-])@margin/)
      if (!!m) {
        let mrg = GURPS.lastTargetedRoll?.margin || 0
        if (m[1] == '+') temp = '' + mrg
        else {
          if (mrg <= 0) temp = '' + mrg
          else temp = '-' + mrg
        }
      }
      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds1 = parseInt(temp)
    }

    let adds2 = 0
    temp = !!result.groups?.adds2 ? result.groups.adds2 : ''
    if (!!temp && temp !== '') {
      temp = temp.startsWith('+') ? temp.slice(1) : temp
      adds2 = parseInt(temp)
    }

    let formula = diceText
    let rolled = false
    if (!!result.groups?.D) {
      rolled = true
      if (result.groups.D === 'd') formula = d6ify(diceText, '[Damage]') // GURPS dice (assume 6)
    }
    let displayText = overrideDiceText || diceText // overrideDiceText used when actual formula isn't 'pretty' SW+2 vs 1d6+1+2
    let min = 1

    if (damageType === '' || damageType === null) damageType = 'dmg'
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
      rolled: rolled,
      modifier: modifier,
      diceText: displayText + additionalText,
      damageType: damageType,
      extdamagetype: extdamagetype,
      multiplier: multiplier,
      divisor: divisor,
      adds1: adds1,
      adds2: adds2,
      min: min,
    }
    // console.log(diceData)
    return diceData
  }

  /**
   * This method creates the content of each draggable section with
   * damage rolled for a single target.
   * @param {GurpsActor|User} actor
   * @param {diceData} diceData
   * @param {*} tokenName
   * @param {*} targetmods
   */
  async _createDraggableSection(actor, diceData, tokenName, targetmods, hitlocation) {
    let roll = /** @type {GurpsRoll} */ (Roll.create(diceData.formula + `+${diceData.modifier}`))
    await roll.evaluate()

    let diceValue = parseInt(roll.result.split(' ')[0]) // in 0.8.X, result is string, so must make into int
    let dicePlusAdds = diceValue + diceData.adds1 + diceData.adds2
    let rollTotal = roll.total || 0
    diceData.loaded = roll.isLoaded

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
        tempString = diceValue.toString()
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
      attacker: actor.id,
      dice: diceData.diceText,
      damageType: diceData.damageType,
      damageTypeText: diceData.damageType === 'dmg' ? ' ' : `'${diceData.damageType}' `,
      damageModifier: diceData.extdamagetype,
      armorDivisor: diceData.divisor,
      damage: damage,
      hasExplanation: hasExplanation,
      explainLineOne: explainLineOne,
      explainLineTwo: explainLineTwo,
      isB378: b378,
      roll: roll,
      target: tokenName,
      hitlocation: hitlocation,
    }
    return contentData
  }

  /**
   * @param {GurpsActor | User } actor
   * @param {diceData} diceData
   * @param {any[]} targetmods
   * @param {any[]} draggableData
   * @param {JQuery.Event|null} event
   */
  async _createChatMessage(actor, diceData, targetmods, draggableData, event) {
    let userTarget = null
    if (!!game.user.targets.size) {
      userTarget = game.user.targets.values().next().value
    }

    let damageType = diceData.damageType === 'dmg' ? '' : diceData.damageType
    damageType = !!diceData.extdamagetype ? `${damageType} ${diceData.extdamagetype}` : damageType

    let html = await renderTemplate('systems/gurps/templates/damage-message.hbs', {
      draggableData: draggableData,
      rolled: diceData.rolled,
      dice: diceData.diceText,
      loaded: diceData.loaded,
      damageTypeText: `${damageType} `,
      modifiers: targetmods.map(it => `${it.mod} ${it.desc.replace(/^dmg/, 'damage')}`),
      userTarget: userTarget,
      hitlocation: draggableData[0].hitlocation,
      numtimes: draggableData.length > 1 ? ' x' + draggableData.length : '',
    })

    // @ts-ignore
    const speaker = ChatMessage.getSpeaker({ actor: actor })
    /** @type {Record<string,any>} */
    let messageData = {
      user: game.user.id,
      speaker: speaker,
      content: html,
      rolls: [draggableData[0].roll], // only need to stringify when sending to chat
    }

    if (event?.shiftKey) {
      if (game.user.isGM) {
        messageData.whisper = [game.user.id]
      } else messageData.whisper = game.users.filter(u => u.isGM).map(u => u.id)
      messageData.blind = true
    }

    messageData['flags.transfer'] = JSON.stringify({
      type: 'damageItem',
      payload: draggableData,
      userTarget: !!userTarget ? userTarget.id : null,
    })

    if (isNiceDiceEnabled()) {
      /** @type {GurpsRoll[]} */
      let rolls = draggableData.map(d => d.roll)
      let throws = []
      /**
       * @type {{ result: any; resultLabel: any; type: string; vectors: never[]; options: {}; }[]}
       */
      let dice = []

      rolls.shift() // The first roll will be handled by DSN's chat handler... the rest we will manually roll
      rolls.forEach(roll => {
        roll.dice.forEach(die => {
          let type = 'd' + die.faces
          die.results.forEach(s =>
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
        // @ts-ignore
        game.dice3d.show({ throws: throws })
      }
    } else {
      messageData.sound = CONFIG.sounds.dice
    }
    ChatMessage.create(messageData)
  }

  static async _calculateAndSelectTargets(canvas, dropData) {
    // We need to know who is:
    // 1. The Attacker Actor: The actor that rolled the damage
    // 2. The Game User: The user which makes the drag
    // 3. The User existing Targets or the Token which user dropped the damage on
    let attackerActor = game.actors.get(dropData.payload.attacker)
    const { user } = game
    if (!isValidUser(user, attackerActor)) {
      ui.notifications?.warn(game.i18n.localize('GURPS.invalidUserForDamageWarning'))
      return false
    }

    // Get all tokens under the drop point.
    let selectedTokens = canvas.tokens.objects.children.filter(t => t.hitArea.contains(dropData.x - t.x, dropData.y - t.y))

    if (selectedTokens.length > 1) selectedTokens = await selectTarget(selectedTokens)

    if (selectedTokens.length === 0) {
      selectedTokens = user?.targets.values().toArray()

      if (!selectedTokens || selectedTokens.length === 0) {
        ui.notifications?.warn(game.i18n.localize('GURPS.selectTargetForDamageWarning'))
        return false
      }

      if (selectedTokens.length > 1) selectedTokens = await selectTarget(selectedTokens, true)
    }

    if (selectedTokens.length > 0) {
      for (let target of selectedTokens) {
        dropData.payload.token = target
        if (target.actor) await target.actor.handleDamageDrop(dropData.payload)
      }
      return false
    }

    return true

    function isValidUser(user, attackerActor) {
      if (game.user.isGM) return true
      const userCanAdd = !game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_ONLY_GMS_OPEN_ADD)
      const userOwnsAttacker = attackerActor ? user.character === attackerActor : false
      if (!userOwnsAttacker) ui.notifications?.warn(game.i18n.localize('GURPS.noUserForDamageWarning'))
      return userCanAdd && userOwnsAttacker
    }
  }
}

DamageChat.fullRegex =
  /^(?<roll>\d+(?<D>d\d*)?(?<adds1>[+-]@?\w+)?(?<adds2>[+-]\d+)?)(?:[×xX\*](?<mult>\d+\.?\d*))?(?: ?\((?<divisor>-?\d+(?:\.\d+)?)\))?/

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
