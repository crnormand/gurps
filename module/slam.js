'use strict'

import { ChatProcessors, ChatProcessor } from '../module/chat.js'
import selectTarget from '../module/select-target.js'
import { GurpsRoll } from './modifiers.js'

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
    let selected = null
    if (targets.length > 1) {
      let promise = selectTarget()
      promise.then(target => {
        SlamCalculator.process(actor, target)
      })
    } else {
      if (targets.length === 1) selected = [...targets][0]
      SlamCalculator.process(actor, selected)
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
   * @param {Actor} actor
   * @param {Token} target
   * @param {*} options
   */
  constructor(actor, target, options = {}) {
    super(options)

    this._actor = actor
    this._target = target

    this._calculator = new _SlamCalculator()

    this._attackerHp = !!actor ? actor.data.data.HP.max : 10
    this._attackerSpeed = !!actor ? parseInt(actor.data.data.basicmove.value) : 5

    this._targetHp = !!target ? target.actor.data.data.HP.max : 10
    this._targetSpeed = 0

    this._isAoAStrong = false
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/slam.html',
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
    data.attacker = this._actor.data.token.name
    data.target = !!this._target ? this._target.data.name : 'a target'
    return data
  }

  get relativeSpeed() {
    return this._attackerSpeed + this._targetSpeed
  }

  _updateObject(event, html) {
    this._isAoAStrong = $(event.target).find('#aoa').is(':checked')
    this._calculator.process(this)
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
  process(data) {
    // If you hit, you and your foe each inflict dice of
    // crushing damage on the other equal to (HP x velocity)/100.
    let rawDamageAttacker = (data._attackerHp * data.relativeSpeed) / 100
    let attackerDice = this._getDicePlusAdds(rawDamageAttacker, data._isAoAStrong)

    let rawDamageTarget = (data._targetHp * data.relativeSpeed) / 100
    let targetDice = this._getDicePlusAdds(rawDamageTarget)

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
  Attacker ${data._actor.data.name} slams ${data._target.data.name}.
  ---
  Relative Speed: ${data.relativeSpeed}
  ${data._actor.data.name}:
    HP (${data._attackerHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageAttacker}
    Dice: ${attackerDice.dice}d${attackerDice.adds >= 0 ? '+' : ''}${attackerDice.adds}

  ${data._target.data.name}:
    HP (${data._targetHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageTarget}
    Dice: ${targetDice.dice}d${targetDice.adds >= 0 ? '+' : ''}${targetDice.adds}
`
    )
  }

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
}
