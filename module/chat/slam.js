'use strict'

import { ChatProcessors, ChatProcessor } from '../../module/chat.js'
import selectTarget from '../../module/select-target.js'
import { i18n } from '../../lib/utilities.js'
import { SlamCalculator } from './slam-calc.js'

/**
 * Handle the '/slam' command. Must have a selected actor.
 */
export default class SlamChatProcessor extends ChatProcessor {
  static initialize() {
    ChatProcessors.registerProcessor(new SlamChatProcessor())
  }

  constructor() {
    super()
  }

  help() {
    return '/slam'
  }

  matches(line) {
    return line.startsWith('/slam')
  }

  process(line) {
    let actor = GURPS.LastActor
    if (!actor) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
      return
    }

    // see if there are any targets
    let targets = actor.getUsers().flatMap(u => [...u.targets])
    let target = null
    if (targets.length > 1) {
      let promise = selectTarget()
      promise.then(target => {
        SlamCalculatorForm.process(actor, target)
      })
    } else {
      if (targets.length === 1) target = [...targets][0]
      SlamCalculatorForm.process(actor, target)
    }
    this.privateMessage('Opening Slam Calculator')
  }

  privateMessage(text) {
    this.priv(text)
  }
}

class SlamCalculatorForm extends FormApplication {
  static process(actor, target) {
    let calc = new SlamCalculatorForm(actor, target)
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
    let name = tokens.find(it => it.actorId === attacker.id)?.name

    this._attacker = attacker
    this._name = !!name ? name : attacker.name
    this._target = target

    this._calculator = new SlamCalculator()

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

  _updateObject(event) {
    this._calculator.process(this.getData(), this._attacker, this._target)
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html)

    html.find('#aoa').click(ev => {
      this._isAoAStrong = $(ev.currentTarget).is(':checked')
    })

    html.find('#attacker-speed').change(ev => {
      this._attackerSpeed = parseInt(ev.currentTarget.value)
      this.render(false)
    })

    html.find('#target-speed').change(ev => {
      this._targetSpeed = parseInt(ev.currentTarget.value)
      this.render(false)
    })

    html.find('#attacker-hp').change(ev => {
      this._attackerHp = parseInt(ev.currentTarget.value)
    })

    html.find('#target-hp').change(ev => {
      this._targetHp = parseInt(ev.currentTarget.value)
    })
  }
}
