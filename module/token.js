import { SETTING_MANEUVER_DETAIL, SETTING_MANEUVER_VISIBILITY, SYSTEM_NAME } from '../lib/miscellaneous-settings.js'
import { GurpsActor } from './actor/actor.js'
import Maneuvers from './actor/maneuver.js'
import GurpsActiveEffect from './effects/active-effect.js'
import { _game } from './global-references.js'

export default class GurpsToken extends Token {
  static ready() {
    Hooks.on('createToken', GurpsToken._createToken)
  }

  /**
   * @param {GurpsToken} token
   * @param {any} _data
   * @param {any} _options
   * @param {any} _userId
   */
  static async _createToken(token, _data, _options, _userId) {
    console.log(`create Token`)
    let actor = /** @type {GurpsActor} */ (token.actor)
    // data protect against bad tokens
    if (!!actor) {
      let maneuverText = actor.getGurpsActorData().conditions.maneuver
      actor.updateManeuver(maneuverText)
    }
  }

  /**
   * This is a decorator on the standard drawEffects method, that sets the maneuver icons based
   * on level of detail and player visibility.
   * @override
   */
  async drawEffects() {
    // get only the Maneuvers
    const effects = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects || [])

    if (effects && effects.length > 0) {
      // restore the original token effects in case we've changed them
      // @ts-ignore
      effects.forEach(it => (it.data.icon = it.getFlag('gurps', 'icon')))

      // GM and Owner always see the exact maneuver.. Otherwise:
      if (!_game().user?.isGM && !this.isOwner) {
        const detail = _game().settings.get(SYSTEM_NAME, SETTING_MANEUVER_DETAIL)

        if (detail !== 'Full') {
          // if detail is not 'Full', always replace Feint with Attack
          effects
            .filter(it => 'feint' === /** @type {string} */ (it.getFlag('gurps', 'name')))
            // @ts-ignore
            .forEach(it => (it.data.icon = it.getFlag('gurps', 'alt')))

          if (detail === 'General') {
            // replace every maneuver that has an alternate appearance with it
            effects.forEach(it => {
              let alt = it.getFlag('gurps', 'alt')
              if (alt) it.data.icon = /** @type {string} */ (alt)
            })
          }
        }
      }

      // Remove any icons based on visibility
      const visibility = _game().settings.get(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY)

      // set all icons to null
      if (visibility === 'NoOne') effects.forEach(it => (it.data.icon = null))
      else if (visibility === 'GMAndOwner')
        if (!_game().user?.isGM && !this.isOwner)
          // set icon to null if neither GM nor owner
          effects.forEach(it => (it.data.icon = null))
    } // if (effects)

    // call the original method
    const result = await super.drawEffects()

    return result
  }

  /**
   * @param {string} maneuverName
   */
  async setManeuver(maneuverName) {
    const game = _game()
    // if not in combat, do nothing
    if (game.combats && game.combats.active) {
      if (!game.combats.active.combatants.find(c => c.token?.id === this.id)) return

      // get the new maneuver's data
      let maneuver = Maneuvers.get(maneuverName)

      // get all current active effects that are also maneuvers
      let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)

      if (maneuvers && maneuvers.length === 1) {
        // if there is a single active effect maneuver, update its data
        // @ts-ignore
        if (maneuvers[0].getFlag('gurps', 'name') !== maneuverName) maneuvers[0].update(maneuver)
      } else if (!maneuvers || maneuvers.length === 0) {
        // if there are no active effect maneuvers, add the new one
        // @ts-ignore
        await this.toggleEffect(maneuver, { active: true })
      } else {
        // if there are more than one active effect maneuvers, that's a problem. Let's remove all of them and add the new one.
        console.warn(`More than one maneuver found -- try to fix...`)
        for (const existing of maneuvers) {
          this._toggleManeuverActiveEffect(existing, { active: false })
        }
        await this.toggleEffect(maneuver, { active: true })
      }
    }
  }

  /**
   * Assumes that this token is not in combat any more -- if so, updating the manuever will only
   * update the actor's data model, and not add/update the active effect that represents that
   * Maneuver.
   */
  async removeManeuver() {
    let actor = /** @type {GurpsActor} */ (this.actor)

    // update the data model
    actor.updateManeuver('do_nothing')

    // get all Active Effects that are also Maneuvers
    let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)
    for (const m of maneuvers) {
      this._toggleManeuverActiveEffect(m, { active: false })
    }
  }

  /**
   * @param {ActiveEffect} effect
   */
  async _toggleManeuverActiveEffect(effect, options = {}) {
    let data = Maneuvers.get(GurpsActiveEffect.getName(effect))
    await this.toggleEffect(data, options)
  }
}
