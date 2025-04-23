import { SETTING_MANEUVER_DETAIL, SETTING_MANEUVER_VISIBILITY, SYSTEM_NAME } from '../lib/miscellaneous-settings.js'
import { GurpsActor } from './actor/actor.js'
import Maneuvers from './actor/maneuver.js'
import GurpsActiveEffect from './effects/active-effect.js'
import { isCombatActive, isTokenInActiveCombat } from './game-utils.js'
import { TokenActions } from './token-actions.js'

Hooks.once('init', async function () {
  game.settings.register(SYSTEM_NAME, 'token-override-refresh-icon', {
    name: game.i18n.localize('GURPS.settingTokenOverrideRefresh'),
    hint: game.i18n.localize('GURPS.settingHintTokenOverrideRefresh'),
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Token Override Refresh : ${value}`),
  })
})

let overrideRefresh = false

Hooks.once('ready', async function () {
  overrideRefresh = game.settings.get(SYSTEM_NAME, 'token-override-refresh-icon')
})

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
    if (actor) {
      let maneuverText = actor.system.conditions.maneuver
      actor.replaceManeuver(maneuverText)
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
      effects.forEach(it => (it.img = it.getFlag('gurps', 'icon')))

      // GM and Owner always see the exact maneuver.. Otherwise:
      if (!game.user?.isGM && !this.isOwner) {
        const detail = game.settings.get(SYSTEM_NAME, SETTING_MANEUVER_DETAIL)

        if (detail !== 'Full') {
          // if detail is not 'Full', always replace Feint with Attack
          effects
            .filter(it => 'feint' === /** @type {string} */ (it.getFlag('gurps', 'name')))
            // @ts-ignore
            .forEach(it => (it.img = it.getFlag('gurps', 'alt')))

          if (detail === 'General') {
            // replace every maneuver that has an alternate appearance with it
            effects.forEach(it => {
              let alt = it.getFlag('gurps', 'alt')
              if (alt) it.img = /** @type {string} */ (alt)
            })
          }
        }
      }

      // Remove any icons based on visibility
      const visibility = game.settings.get(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY)

      // set all icons to null
      if (visibility === 'NoOne') effects.forEach(it => (it.img = null))
      else if (visibility === 'GMAndOwner')
        if (!game.user?.isGM && !this.isOwner)
          // set icon to null if neither GM nor owner
          effects.forEach(it => (it.img = null))
    } // if (effects)

    // call the original method
    const result = await super.drawEffects()

    return result
  }

  /**
   * Deprecated -- in favor of Actor.toggleStatusEffect
   * @override
   * @param {*} effect
   * @param {*} options
   */
  async toggleEffect(effect, options) {
    if (this.isPostureEffect(effect)) {
      // see if there are other Posture ActiveEffects active
      let existing = this.getAllActivePostureEffects()

      existing = existing.filter(e => e.statuses.find(s => s !== effect.id))

      // if so, toggle them off:
      for (let e of existing) {
        for (const statusId of e.statuses) {
          await this.actor.toggleStatusEffect(GURPS.StatusEffect.lookup(statusId).id, { active: false })
        }
      }
    }

    await this.actor.toggleStatusEffect(effect.id)
  }

  getAllActivePostureEffects() {
    return this.actor.effects.filter(e => e.getFlag('gurps', 'effect.type') === 'posture')
  }

  isPostureEffect(effect) {
    return effect?.img && foundry.utils.getProperty(effect, 'flags.gurps.effect.type') === 'posture'
  }

  async setEffectActive(name, active) {
    // lookup effect
    let effect = GURPS.StatusEffect.lookup(name)

    // check to see if it is active
    let existing = this.actor.effects.find(e => e.statuses.find(s => s === name))
    // let existing = this.actor.effects.find(e => e.getFlag('core', 'statusId') === name)

    if (active && !!existing) return
    if (!active && !existing) return

    await this.toggleEffect(effect)
  }

  /**
   * We use this function because maneuvers are special Active Effects: maneuvers don't apply
   * outside of combat, and only one maneuver can be active simultaneously. So we really don't
   * deactivate the old maneuver and then activate the new one -- we simply update the singleton
   * maneuver data to match the new maneuver's data.
   *
   * @param {string} maneuverName
   */
  async setManeuver(maneuverName) {
    // if not in combat, do nothing
    if (isCombatActive) {
      if (!isTokenInActiveCombat(this)) return

      // get the new maneuver's data
      let maneuver = Maneuvers.get(maneuverName)
      if (!maneuver) {
        this.actor._renderAllApps()
        return
      }

      // get all current active effects that are also maneuvers
      let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)

      if (maneuvers && maneuvers.length === 1) {
        // if there is a single active effect maneuver, update its data
        if (maneuvers[0].getFlag('gurps', 'name') !== maneuverName) maneuvers[0].update(maneuver)
      } else if (!maneuvers || maneuvers.length === 0) {
        // if there are no active effect maneuvers, add the new one
        maneuver.name = game.i18n.localize(maneuver.name ?? /** @deprecated since v12 */ maneuver.label)
        maneuver.img ??= /** @deprecated since v12 */ maneuver.icon
        maneuver.statuses = Array.from(new Set([maneuver.id, ...(maneuver.statuses ?? [])]))

        const effect = new GurpsActiveEffect(maneuver)
        await GurpsActiveEffect.create(effect, { parent: this.actor, keepId: true })
      } else {
        // if there are more than one active effect maneuvers, that's a problem. Let's remove all of them and add the new one.
        console.warn(`More than one maneuver found -- try to fix...`)
        for (const existing of maneuvers) {
          await existing.delete()
        }

        maneuver.name = game.i18n.localize(maneuver.name ?? /** @deprecated since v12 */ label)
        maneuver.img ??= /** @deprecated since v12 */ icon
        maneuver.statuses = Array.from(new Set([id, ...(maneuver.statuses ?? [])]))

        const effect = new GurpsActiveEffect(maneuver.data)
        await GurpsActiveEffect.create(effect, { parent: this.actor, keepId: true })
      }

      // Finally update Token Actions
      const actions = await TokenActions.fromToken(this)
      await actions.selectManeuver(maneuver, game.combat.round)
    }
  }

  /**
   * Assumes that this token is not in combat any more -- if so, updating the manuever will only
   * update the actor's data model, and not add/update the active effect that represents that
   * Maneuver.
   */
  async removeManeuver() {
    let actor = this.actor

    // get all Active Effects that are also Maneuvers
    let maneuvers = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects)
    for (const m of maneuvers) {
      m.delete()
    }
  }

  /**
   * @param {ActiveEffect} effect
   */
  async _toggleManeuverActiveEffect(effect, options = {}) {
    let data = Maneuvers.get(GurpsActiveEffect.getName(effect))
    await this.toggleEffect(data, options)
  }

  /**
   * Size and display the Token Icon
   *
   * FIXME This is a horrible hack to fix Foundry's scaling of figures in a hex grid. By default, Foundry
   *       scales tokens to fit the width of the grid if the "aspect" of the token is equal to or greater
   *       than 1, where aspect is width/height. For Hex Columns, the width is measured from vertex to vertex;
   *       for Hex Rows, the width is measured flat-side to flat-side. This results in tokens overflowing
   *       a Hex Column, taking up space in adjacent hexes. This "fixes" that for a subset of tokens -- where
   *       the token has an aspect of 1, we scale the token based on the smaller of the two dimensions.
   */
  _refreshIcon() {
    // let override = game.settings.get(Settings.SYSTEM_NAME, 'token-override-refresh-icon')
    if (!overrideRefresh) return super._refreshIcon()

    // Size the texture aspect ratio within the token frame
    const tex = this.texture
    let aspect = tex.width / tex.height
    const scale = this.img.scale

    if (aspect == 1) {
      if (this.w > this.h) aspect = 0.9 // force scaling by height when width is greater than height
    }

    if (aspect >= 1) {
      this.img.width = this.w * this.scale
      scale.y = Number(scale.x)
    } else {
      this.img.height = this.h * this.scale
      scale.x = Number(scale.y)
    }

    // Mirror horizontally or vertically
    this.img.scale.x = Math.abs(this.img.scale.x) * (this.mirrorX ? -1 : 1)
    this.img.scale.y = Math.abs(this.img.scale.y) * (this.mirrorY ? -1 : 1)

    // Set rotation, position, and opacity
    this.img.rotation = this.lockRotation ? 0 : Math.toRadians(this.rotation)
    this.img.position.set(this.w / 2, this.h / 2)
    this.img.alpha = this.hidden ? Math.min(this.alpha, 0.5) : this.alpha
    this.img.visible = true
  }
}
