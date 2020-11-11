'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'hitLocationToolTips'

/*
  Responsible for enabling or disabling the tooltip for equipment per hit location
  on the full sheet.

  - Defines a per-client system setting to toggle the tooltip, and maintains an
    instance variable (display) to reflect the setting.

  - Handle updates to the setting by re-rendering all currently rendered apps.

  - Registers a Handlebars helper (gurpstippable) to toggle the tooltip on the
    sheet. Usage: <div class='{{gurpstippable}}' data-tooltip='Text'></div>. 
    This adds or removes the 'gurpstippable' class to the element.
*/
export default class HitLocationEquipmentTooltip {
  constructor() {
    this.setup()
    this.display = true
  }

  setup() {
    let self = this

    Hooks.once('init', async function () {
      // Register the setting.
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
      // Updates the display according to the stored value of the setting.
      self.update()
    })

    // register the Handlebars helper
    Handlebars.registerHelper('gurpstippable', function (str) {
      return self.display ? 'gurpstippable' : ''
    });
  }

  // get the current value, update the display instance variable, and render any
  // open apps to ensure they reflect the current setting.
  async update() {
    let currentValue = game.settings.get(SYSTEM_NAME, SETTING_NAME)

    console.log('Equipment tooltip:' + currentValue)
    this.display = currentValue

    // FYI render all open apps
    Object.values(ui.windows).filter(it => it.rendered).forEach(app => app.render(true))
  }
}
