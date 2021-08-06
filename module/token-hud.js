import Maneuvers from './actor/maneuver.js'

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
