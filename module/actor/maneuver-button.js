import { i18n } from '../../lib/utilities.js'
import { Maneuvers } from './maneuver.js'

/**
 * This class is used as a namespace for Show Art
 * static methods. It has no constructor.
 *
 * @namespace ManeuverHUDButton
 */
export default class ManeuverHUDButton {
  static async getInnerHtml(effects) {
    return await renderTemplate('systems/gurps/templates/maneuver-hud.hbs', {
      maneuvers: Maneuvers.getData(),
      effects: effects,
    })
  }

  /**
   * Retrieves the Actor associated with a given token.
   *
   * @static
   * @param {Token} token - The Token to look for the Actor of.
   * @return {Actor} The associated Actor.
   * @memberof ManeuverHUDButton
   */
  static getTokenActor(token) {
    return game.actors.get(token.actorId)
  }

  /**
   * Create the HTML elements for the HUD button
   * including the Font Awesome icon and tooltop.
   *
   * @static
   * @return {Element} The `<div>` element that is used as the HUD button.
   * @memberof ManeuverHUDButton
   */
  static async createButton(effects) {
    let button = document.createElement('div')

    button.classList.add('control-icon')
    button.classList.add('maneuver-open')
    button.setAttribute('data-action', 'maneuver')
    button.title = i18n('GURPS.setManeuver', 'Set Maneuver')
    button.innerHTML = await ManeuverHUDButton.getInnerHtml(effects)
    return button
  }

  /**
   * Adds the button to the Token HUD,
   * and attaches event listeners.
   *
   * @static
   * @param {TokenHUD} hud - The HUD object, not used.
   * @param {jQuery} html - The jQuery reference to the HUD HTML.
   * @param {Token} token - The data for the Token.
   * @memberof ManeuverHUDButton
   */
  static async prepTokenHUD(hud, html, token) {
    // const actor = this.getTokenActor(token)
    if (!hud.object?.combatant) return

    const actor = hud.object?.actor
    const button = await this.createButton(token.effects)

    html.find('div.right').append(button)

    html.find('#collapsible-hud').on('change', function () {
      let icon = html.find('.control-icon.maneuver-open')
      this.checked ? icon.addClass('active') : icon.removeClass('active')
    })

    html.find('.status-maneuvers .effect-control').click(ev => {
      let key = $(ev.currentTarget).attr('data-status-id')
      actor.updateManeuver(key, token._id)

      html.find('.status-maneuvers .effect-control').removeClass('active')
      $(ev.currentTarget).addClass('active')
    })
  }

  // DONE add a migration to set the maneuver token effect for all tokens
  // DONE figure out how to remove maneuver from other status effects OR make clicking it add the "do nothing" maneuver
  // DONE implement the various options: \
  //      √ full detail: exact maneuver and option
  //      √ general detail: maneuver name w/o option
  // TODO implement visibility: \
  //      √ everyone
  //      √ GM and Owner only
  //      - same Disposition [Friendly, Neutral, Hostile]
  //      - per token [Always for Everyone, Same Disposition, Only When Controlled, etc...]
  // TODO Ultimately turn this into an Active Effect - and actually adjust Move and/or other conditions
  // TODO Add status hint text to modifier bucket
  // DONE Make sure Tokens are initialized with a Maneuver
  // DONE Add maneuver when token enters combat; remove when not in combat
}
