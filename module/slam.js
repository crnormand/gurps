'use strict'

import { ChatProcessors } from '../module/chat.js'
import { GurpsRoll } from './modifiers.js'

export default class SlamChatProcessor {
  static initialize() {
    ChatProcessors.registerProcessor(new SlamChatProcessor())
  }

  matches(line) {
    return line.startsWith('/slam')
  }

  process(line, msgs) {
    SlamCalculator.process()
    return true
  }
}

class SlamCalculator extends FormApplication {
  static process() {
    let calc = new SlamCalculator()
    calc.render(true)
  }

  constructor(actor, target, options = {}) {
    super(options)

    this._calculator = new _SlamCalculator()

    this._attackerHp = !!actor ? actor.data.data.HP.max : 10
    this._attackerSpeed = !!actor ? actor.data.data.basicMove : 5

    this._targetHp = !!target ? target.data.data.HP.max : 10
    this._targetSpeed = !!target ? target.data.data.basicMove : 5

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
    return data
  }

  get relativeSpeed() {
    return this._attackerSpeed + this._targetSpeed
  }

  _updateObject() {
    this._isAoAStrong = html.find('aoa').is(':checked')
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
    let attackerDice = this._getDicePlusAdds(data._attackerHp, data.relativeSpeed, data._isAoAStrong)
    let targetDice = (data._targetHp, data.relativeSpeed)

    // attackerDice = Roll.create('1d6-1!')
  }

  _getDicePlusAdds(hp, speed, isAoAStrong = false) {
    // If you hit, you and your foe each inflict dice of
    // crushing damage on the other equal to (HP ¥ velocity)/100.
    let rawDamage = (hp * speed) / 100

    // If damage is less than 1d, ...
    if (rawDamage < 1) {
      // treat fractions up to 0.25 as 1d-3, ...
      if (rawDamage <= 0.25) return { dice: 1, adds: -3 }

      // fractions up to 0.5 as 1d-2, ...
      if (rawDamage <= 0.5) return { dice: 1, adds: -2 }
      //attackerDice = Roll.create('1d6-2!')

      // and any larger fraction as 1d-1.
      return { dice: 1, adds: -1 }
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
