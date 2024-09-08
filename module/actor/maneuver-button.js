import { i18n } from '../../lib/utilities.js'
import GurpsToken from '../token.js'
import Maneuvers from './maneuver.js'

/**
 * This class is used as a namespace for Show Art
 * static methods. It has no constructor.
 *
 * @namespace ManeuverHUDButton
 */
export default class ManeuverHUDButton {
  /**
   * @param {ActiveEffect[]} effects
   */
  static async getInnerHtml(effects) {
    return await renderTemplate('systems/gurps/templates/maneuver-hud.hbs', {
      maneuvers: Maneuvers.getAllData(),
      effects: effects,
    })
  }

  /**
   * Retrieves the Actor associated with a given token.
   *
   * @static
   * @param {Token} token - The Token.
   * @return {Actor|undefined} The associated Actor.
   * @memberof ManeuverHUDButton
   */
  static getTokenActor(token) {
    if (game.actors && token?.actor?.id) return game.actors?.get(token.actor.id)
  }

  /**
   * Create the HTML elements for the HUD button
   * including the Font Awesome icon and tooltop.
   *
   * @static
   * @param {ActiveEffect[]} effects
   * @return {Promise<Element>} The `<div>` element that is used as the HUD button.
   * @memberof ManeuverHUDButton
   */
  static async createButton(effects) {
    let button = document.createElement('div')

    button.classList.add('control-icon')
    button.classList.add('maneuver-open')
    button.setAttribute('data-action', 'maneuver')
    button.title = i18n('GURPS.setManeuver')
    button.innerHTML = await ManeuverHUDButton.getInnerHtml(effects)
    return button
  }

  /**
   * Adds the button to the Token HUD,
   * and attaches event listeners.
   *
   * @static
   * @param {TokenHUD} hud - The HUD object, not used.
   * @param {JQuery} html - The jQuery reference to the HUD HTML.
   * @param {Token} token - The data for the Token.
   * @memberof ManeuverHUDButton
   */
  static async prepTokenHUD(hud, html, token) {
    if (!hud.object?.combatant) return

    // @ts-ignore
    // const button = await this.createButton(token.effects)
    const effects = await game.actors.get(token.actorId).effects.contents
    const button = await this.createButton(effects)

    html.find('div.right').append(button)

    html.find('#collapsible-hud').on('change', function () {
      let icon = html.find('.control-icon.maneuver-open')
      // @ts-ignore
      this.checked ? icon.addClass('active') : icon.removeClass('active')
    })

    html.find('.status-maneuvers .effect-control').click(ev => {
      let key = $(ev.currentTarget).attr('data-status-id') || ''
      let token = hud.object
      token.setManeuver(key)

      html.find('.status-maneuvers .effect-control').removeClass('active')
      $(ev.currentTarget).addClass('active')
    })
  }

  // TODO implement visibility: \
  //      √ everyone
  //      √ GM and Owner only
  //      - same Disposition [Friendly, Neutral, Hostile]
  //      - per token [Always for Everyone, Same Disposition, Only When Controlled, etc...]
  // TODO Ultimately turn this into an Active Effect - and actually adjust Move and/or other conditions
  // TODO Add status hint text to modifier bucket

}
