import { i18n } from '../../lib/utilities.js'
import { Maneuvers } from './maneuver.js'

// lazy-initialized varaible for the html template
let html = null

/**
 * This class is used as a namespace for Show Art
 * static methods. It has no constructor.
 *
 * @namespace ManeuverHUDButton
 */
export default class ManeuverHUDButton {
  static async getInnerHtml() {
    if (html == null) {
      html = await renderTemplate('systems/gurps/templates/maneuver-hud.hbs', Maneuvers)
    }
    return html
  }
  /**
   * Handles the click or contextmenu events for tile/token art buttons
   *
   * @static
   * @param {Event} event - The triggering event.
   * @param {string} image - The file path of the image to display.
   * @param {string} title - The name to display in the popup title bar.
   * @memberof ManeuverHUDButton
   */
  static buttonEventHandler(event, image, title) {
    const pop = this.createImagePopup(image, title)
    if (event.shiftKey && game.user.isGM) pop.shareImage()
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
  static async createButton() {
    let button = document.createElement('div')

    button.classList.add('control-icon')
    button.classList.add('maneuver-open')
    button.setAttribute('data-action', 'maneuver')
    button.title = i18n('GURPS.setManeuver', 'Set Maneuver')
    button.innerHTML = await ManeuverHUDButton.getInnerHtml()
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
    const actor = this.getTokenActor(token)
    const button = await this.createButton()

    // $(artButton)
    //   .click(event => this.buttonEventHandler(event, images.actor, titles.actor))
    //   .contextmenu(event => this.buttonEventHandler(event, images.token, titles.token))

    html.find('div.right').append(button)

    html.find('#collapsible-hud').on('change', function () {
      let icon = html.find('.control-icon.maneuver-open')
      this.checked ? icon.addClass('active') : icon.removeClass('active')
    })

    html.find('.status-maneuvers .effect-control').click(ev => {
      let key = $(ev.currentTarget).attr('data-status-id')
      actor.updateManeuver(key)
    })
  }
}
