'use strict'

import { ChatProcessors, ChatProcessor } from '../module/chat.js'
import selectTarget from '../module/select-target.js'
import { isNiceDiceEnabled, generateUniqueId } from '../lib/utilities.js'

/**
 * Handle the '/slam' command. Must have a selected actor. The
 */
export default class SlamChatProcessor extends ChatProcessor {
  static initialize() {
    ChatProcessors.registerProcessor(new SlamChatProcessor())
  }

  constructor() {
    super()
  }

  matches(line) {
    return line.startsWith('/slam')
  }

  async process(line, msgs) {
    let actor = GURPS.LastActor
    if (!actor) {
      ui.notifications.warn('You must have a character selected')
      return true
    }

    // see if there are any targets
    let targets = actor.getUsers().flatMap(u => [...u.targets])
    let target = null
    if (targets.length > 1) {
      let promise = selectTarget()
      promise.then(target => {
        SlamCalculator.process(actor, target)
      })
    } else {
      if (targets.length === 1) target = [...targets][0]
      SlamCalculator.process(actor, target)
    }

    return true
  }
}

class SlamCalculator extends FormApplication {
  static process(actor, target) {
    let calc = new SlamCalculator(actor, target)
    calc.render(true)
  }

  /**
   * Construct the dialog.
   * @param {Actor} attacker
   * @param {Token} target
   * @param {*} options
   */
  constructor(attacker, target, options = {}) {
    super(options)

    // find out the token name for a given actor
    let activeScene = game.scenes.active
    let tokens = activeScene.data.tokens
    let name = tokens.find(it => it.actorId === attacker.id).name

    this._attacker = attacker
    this._name = !!name ? name : attacker.name
    this._target = target

    this._calculator = new _SlamCalculator()

    this._attackerHp = !!attacker ? attacker.data.data.HP.max : 10
    this._attackerSpeed = !!attacker ? parseInt(attacker.data.data.basicmove.value) : 5

    this._targetHp = !!target ? target.actor.data.data.HP.max : 10
    this._targetSpeed = 0

    this._isAoAStrong = false
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/slam-calculator.html',
      classes: ['single-column-form'],
      popOut: true,
      minimizable: false,
      jQuery: true,
      resizable: false,
      title: game.i18n.localize('GURPS.slamCalculator'),
    })
  }

  getData(options) {
    const data = super.getData(options)
    data.cssClass = 'single-column-form'
    data.attackerHp = this._attackerHp
    data.attackerSpeed = this._attackerSpeed
    data.targetHp = this._targetHp
    data.targetSpeed = this._targetSpeed
    data.relativeSpeed = this.relativeSpeed
    data.attacker = this._name
    data.isAoAStrong = this._isAoAStrong
    data.target = !!this._target ? this._target.data.name : `(${game.i18n.localize('GURPS.target')})`
    return data
  }

  get relativeSpeed() {
    return this._attackerSpeed + this._targetSpeed
  }

  _updateObject(event, html) {
    this._isAoAStrong = $(event.target).find('#aoa').is(':checked')
    this._calculator.process(this.getData(), this._attacker, this._target)
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('#attacker-speed').change(ev => {
      this._attackerSpeed = parseInt(ev.currentTarget.value)
      this.render(false)
    })

    html.find('#target-speed').change(ev => {
      this._targetSpeed = parseInt(ev.currentTarget.value)
      this.render(false)
    })
  }
}

class _SlamCalculator {
  async process(data, attacker, target) {
    // If you hit, you and your foe each inflict dice of
    // crushing damage on the other equal to (HP x velocity)/100.
    let rawDamageAttacker = (data.attackerHp * data.relativeSpeed) / 100
    let attackerDice = this._getDicePlusAdds(rawDamageAttacker, data.isAoAStrong)

    let rawDamageTarget = (data.targetHp * data.relativeSpeed) / 100
    let targetDice = this._getDicePlusAdds(rawDamageTarget)

    let attackerRoll = Roll.create(`${attackerDice.dice}d6! + ${attackerDice.adds}`)
    attackerRoll.evaluate()
    let attackerResult = Math.max(attackerRoll.total, 1)

    let targetRoll = Roll.create(`${targetDice.dice}d6! + ${targetDice.adds}`)
    targetRoll.evaluate()
    let targetResult = Math.max(targetRoll.total, 1)

    let effects = {
      unaffected: 'GURPS.notAffected',
      fallsDown: 'GURPS.fallsDown',
      dxCheck: 'GURPS.dxCheckOrFall',
    }
    let effect = effects.unaffected

    if (attackerResult >= targetResult * 2) {
      effect = effects.fallsDown
    } else if (attackerResult >= targetResult) {
      effect = effects.dxCheck
    } else if (targetResult >= attackerResult * 2) {
      effect = effects.fallsDown
    }

    let message = `${data.target} ${game.i18n.localize(effect)}`

    let html = await renderTemplate('systems/gurps/templates/slam-results.html', {
      id: generateUniqueId(),
      attacker: data.attacker,
      attackerHp: data.attackerHp,
      attackerRaw: rawDamageAttacker,
      attackerDice: attackerDice,
      attackerResult: attackerResult,
      attackerExplain: this.explainDieRoll(attackerRoll),
      // ---
      target: data.target,
      targetHp: data.targetHp,
      targetRaw: rawDamageTarget,
      targetDice: targetDice,
      targetResult: targetResult,
      targetExplain: this.explainDieRoll(targetRoll),
      // ---
      effect: effect,
      isAoAStrong: data.isAoAStrong,
      relativeSpeed: data.relativeSpeed,
      result: message,
    })

    // const speaker = { alias: attacker.name, _id: attacker._id, actor: attacker }
    let messageData = {
      user: game.user._id,
      // speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: attackerRoll,
      sound: this.rollThemBones([targetRoll]),
    }

    ChatMessage.create(messageData).then(arg => {
      console.log(arg)
      // let messageId = arg.data._id // 'qHz1QQuzpJiavH3V'
      // $(`[data-message-id='${messageId}']`).click(ev => game.GURPS.handleOnPdf(ev))
    })

    // Chat message:
    // Slam Attack
    // Attacker _____ slams [target|____].
    //   [Target|____] must roll [DX or fall down].
    // OR
    //   [Target|____] falls down! (set condition 'Prone')
    // OR
    //   [Target|____] is not affected.
    // OR [Attacker] falls down! (set condition 'Prone')
    // SHOW THE MATH
    // Bjorn:
    //   HP (17) x Speed (8) / 100 = 1.36
    //   Dice: 1d -> Roll: 4
    // Zombie:
    //   HP: (11)  Speed: (8) / 100 = 0.88
    //   Dice: 1d-1 -> Roll: 2
    //
    // attackerDice = Roll.create('1d6-1!')
    console.log(
      `Slam Attack
  ${data.attacker} slams ${data.target}.
  ---
  Relative Speed: ${data.relativeSpeed}
  ${data.attacker}:
    HP (${data.attackerHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageAttacker}
    Dice: ${attackerDice.dice}d${attackerDice.adds >= 0 ? '+' : ''}${attackerDice.adds}

  ${data.target}:
    HP (${data.targetHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageTarget}
    Dice: ${targetDice.dice}d${targetDice.adds >= 0 ? '+' : ''}${targetDice.adds}
`
    )
  }

  /**
   * Calculate the dice roll from the rawDamage value.
   *
   * @param {Number} rawDamage
   * @param {Boolean} isAoAStrong
   * @returns an Object literal with two attributes: dice (integer) and adds (integer)
   */
  _getDicePlusAdds(rawDamage, isAoAStrong = false) {
    let bonusForAoA = isAoAStrong ? 2 : 0
    // If damage is less than 1d, ...
    if (rawDamage < 1) {
      // treat fractions up to 0.25 as 1d-3, ...
      if (rawDamage <= 0.25) return { dice: 1, adds: -3 + bonusForAoA }

      // fractions up to 0.5 as 1d-2, ...
      if (rawDamage <= 0.5) return { dice: 1, adds: -2 + bonusForAoA }

      // and any larger fraction as 1d-1.
      return { dice: 1, adds: -1 + bonusForAoA }
    }

    // Otherwise, round fractions of 0.5 or more up to a full die.
    let dice = Math.floor(rawDamage)
    if (rawDamage - dice >= 0.5) dice++

    // You can use All-Out Attack (Strong) to increase your damage!
    // you get +2 to damage – or +1 damage per die, if that would be better.
    let adds = 0
    if (isAoAStrong) adds = dice > 1 ? dice : 2

    return { dice: dice, adds: adds }
  }

  /**
   *
   * @param {Aray<Roll>} rollArray
   */
  rollThemBones(rollArray) {
    if (!isNiceDiceEnabled()) return CONFIG.sounds.dice

    if (!Array.isArray(rollArray)) {
      rollArray = [rollArray]
    }

    let dice = []
    rollArray.forEach(r => {
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

    if (dice.length > 0) {
      game.dice3d.show({ throws: [{ dice: dice }] })
    }
  }

  explainDieRoll(roll) {
    let diceArray = roll.dice
    let resultsArray = diceArray.flatMap(it => it.results)
    let results = resultsArray.map(it => it.result)

    return roll.terms.length > 1 ? `Rolled (${results}) ${roll.terms[1]} ${roll.terms[2]}` : `Rolled ${results}`
  }
}
