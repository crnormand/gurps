'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'hitLocationToolTips'

export default class HitLocationEquipmentTooltip {
  constructor() {
    this.setup()
  }

  setup() {
    let self = this

    Hooks.once('init', async function () {
      game.settings.register(SYSTEM_NAME, SETTING_NAME, {
        name: 'Display hit location equipment:',
        hint: 'Toggles the visibility of a tooltip showing equipment on the hit location.',
        scope: 'client',
        config: true,
        type: Boolean,
        default: true,
        onChange: value => console.log('Equipment tooltip:' + value) // self.update
      })
    })
  }

  async update() { }
}

