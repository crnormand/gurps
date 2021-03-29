'use strict'

import { ChatProcessors } from '../module/chat.js'

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

  constructor(actor, options = {}) {
    super(options)
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/slam.html',
      classes: ['single-column-form'],
      // width: 360,
      // height: 468,
      popOut: true,
      minimizable: false,
      jQuery: true,
      resizable: false,
      title: game.i18n.localize('Slam Calculator'),
    })
  }

  getData(options) {
    const data = super.getData(options)
    data.cssClass = 'single-column-form'
    return data
  }

  _updateObject() {}
}
