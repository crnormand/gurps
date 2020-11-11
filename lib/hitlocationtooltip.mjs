'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'hitLocationToolTips'

export default class HitLocationEquipmentTooltip {
  constructor() {
    this.setup()
    this.display = true
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
        onChange: value => self.update()
      })
    })

    Hooks.once('ready', async function () {
      self.update()
    })

    Handlebars.registerHelper('gurpstippable', function (str) {
      return self.display ? 'gurpstippable' : ''
    });

  }

  async update() {
    let currentValue = game.settings.get(SYSTEM_NAME, SETTING_NAME)

    console.log('Equipment tooltip:' + currentValue)
    this.display = currentValue

    // render all open apps
    Object.values(ui.windows).filter(it => it.rendered).forEach(app => app.render(true))
  }
}
