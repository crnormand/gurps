import { SETTING_MANEUVER_DETAIL, SETTING_MANEUVER_VISIBILITY, SYSTEM_NAME } from '../lib/miscellaneous-settings.js'
import Maneuvers from './actor/maneuver.js'
import GurpsActiveEffect from './effects/active-effect.js'

export default class GurpsToken extends Token {
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
    // if not in combat, do nothing
    if (!_game().combats.active) return
    if (!_game().combats.active.combatants.find(c => c.token.id === this.id)) return

    let maneuver = Maneuvers.get(maneuverName)
    let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)

    if (maneuvers && maneuvers.length === 1) {
      // @ts-ignore
      if (maneuvers[0].getFlag('gurps', 'name') !== maneuverName) maneuvers[0].update(maneuver)
    } else if (!maneuvers || maneuvers.length === 0) {
      // @ts-ignore
      await this.toggleEffect(maneuver, { active: true })
    } else {
      console.warn(`More than one maneuver found -- try to fix...`)
      for (const existing of maneuvers) {
        await existing.delete()
        // FIXME: The duplicate call is temporarily needed to de-dupe legacy tokens. Remove in 0.9.0
        await this.toggleEffect(existing.icon, { active: false })
      }
      // @ts-ignore
      await this.toggleEffect(maneuver, { active: true })
    }
  }

  async removeManeuver() {
    this.actor.updateManeuver('do_nothing')
    let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)
    for (const m of maneuvers) {
      let data = Maneuvers.get(GurpsActiveEffect.getName(m))
      // @ts-ignore
      await this.toggleEffect(data, { active: false })
    }
  }
}

// -- Functions to get type-safe global references (for TS) --

function _game() {
  if (game instanceof Game) return game
  throw new Error('game is not initialized yet!')
}
