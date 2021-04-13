import * as QN from '../domain/Quintessence.js'

const SYSTEM_NAME = 'gurps'
const SETTING_NAME = 'useQuintessence'

export default class GURPSConditionalInjury {
    constructor() {
      let self = this
  
      Hooks.once('init', async function () {
        game.GURPS = GURPS

        Handlebars.registerHelper('qnCurrentEffects', self.currentGrossEffects)
  
        game.settings.register(SYSTEM_NAME, SETTING_NAME, {
          name: 'Options: Quintessence',
          hint:
            'From Pyramid #3/120: The Fifth Attribute adds Quintessence, a fifth attribute for supernatural effects suitable for supernatural and magical campaigns.',
          scope: 'world',
          config: true,
          type: Boolean,
          default: false,
          onChange: value => self.update(),
        })
      })
    }
    async update() {
        // FYI render all open apps
        Object.values(ui.windows)
          .filter(it => it.rendered)
          .forEach(app => app.render(true))
      }
    
      isInUse = () => game.settings.get(SYSTEM_NAME, SETTING_NAME)

    
}