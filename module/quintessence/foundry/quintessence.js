//import * as QN from '../domain/Quintessence.js'
import * as Settings from '../../../lib/miscellaneous-settings.js'



export default class GURPSQuintessence {
  SYSTEM_NAME = 'gurps'
  SETTING_NAME = 'useQuintessence'
  isInUse = () => game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUINTESSENCE)

    constructor() {
      let self = this

    }
    async update() {
        // FYI render all open apps
        Object.values(ui.windows)
          .filter(it => it.rendered)
          .forEach(app => app.render(true))
      }
}