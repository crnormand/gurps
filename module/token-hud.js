import Maneuvers from './actor/maneuver.js'
import * as Settings from '../lib/miscellaneous-settings.js'

// Our override of the TokenHUD; it removes the maneuver tokens from the list of status effects
export default class GURPSTokenHUD extends TokenHUD {
  /**
   * @param {Application.RenderOptions | undefined} [options]
   */
  getData(options) {
    let data = super.getData(options)

    // edit data.statusEffects to remove maneuver icons -- statusEffects is an Object, properties are the icon path
    for (const key in data.statusEffects) {
      if (Maneuvers.isManeuverIcon(key)) {
        delete data.statusEffects[key]
      }
    }
    return data
  }
}

export class QuickRollSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('GURPS.settingUseQuickRolls'),
      id: 'quick-roll-settings',
      template: 'systems/gurps/templates/quick-roll-settings.hbs',
      width: 400,
      closeOnSubmit: true,
    })
  }

  getData() {
    return {
      settings: game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS),
    }
  }

  async _updateObject(event, formData) {
    await game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS, formData)
  }
}
