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

    // render all actors
    for (const actor of game.actors.entities) {
      console.log(actor.name)
      // Foundry BUG? sheet.rendered is 'false' if opened in response to 
      // double-clicking the token. In that case, the player will have to 
      // close and reopen his character sheet.
      if (actor.sheet.rendered) {
        console.log('re-render ' + actor.name)
        await actor.sheet.close()
        await actor.sheet.render(true)
      }
    }
  }
}
