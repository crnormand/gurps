import { i18n } from '../lib/utilities.js'

/**
 * This class is used as a namespace for Show Art
 * static methods. It has no constructor.
 *
 * @namespace ShowArt
 */
export default class ShowArt {
  /**
   * Handles the keydown events for tile and token keybindings
   *
   * @static
   * @param {Event} event - The triggering event.
   * @param {string} image - The file path of the image to display.
   * @param {string} title - The name to display in the popup title bar.
   * @memberof ShowArt
   */
  static keyEventHandler(event, image, title) {
    if (event.target.id == 'chat-message') return
    if (event.shiftKey && (event.key == 'Z' || event.key == 'X')) {
      const pop = this.createImagePopup(image, title)
      if (!event.altKey && game.user.isGM) pop.shareImage()
    }
  }
  /**
   * Handles the click or contextmenu events for tile/token art buttons
   *
   * @static
   * @param {Event} event - The triggering event.
   * @param {string} image - The file path of the image to display.
   * @param {string} title - The name to display in the popup title bar.
   * @memberof ShowArt
   */
  static buttonEventHandler(event, image, title) {
    const pop = this.createImagePopup(image, title)
    if (event.shiftKey && game.user.isGM) pop.shareImage()
  }
  /**
   * Creates and renders and ImagePopout
   * with a specific image and title.
   * the image is set to sharable.
   *
   * @static
   * @param {string} image - The file path of the image to display.
   * @param {string} title - The name to display in the popup title bar.
   * @return {ImagePopout} The instance of the ImagePopout.
   * @memberof ShowArt
   */
  static createImagePopup(image, title) {
    return new MultiMediaPopout(image, {
      title,
      shareable: true,
    }).render(true)
  }
  /**
   * Retrieves the Actor associated with a given token.
   *
   * @static
   * @param {Token} token - The Token to look for the Actor of.
   * @return {Actor} The associated Actor.
   * @memberof ShowArt
   */
  static getTokenActor(token) {
    return game.actors.get(token.actorId)
  }
  /**
   * @typedef {Object} titles
   * @property {string} actor - The title for the Actor
   * @property {string} token - The title for the Token
   *
   * Determin the correct image titles for either the token,
   * or the associated Actor.
   *
   * @static
   * @param {Token} token - The Token to get the title of.
   * @param {Actor} actor - The Actor to get the title of.
   * @return {titles} The titles for actor and token.
   * @memberof ShowArt
   */
  static getTokenTitles(token, actor) {
    const M = CONST.TOKEN_DISPLAY_MODES,
      dn = token.displayName

    if (dn == M.ALWAYS || dn == M.HOVER)
      return {
        actor: token.actorData.name || actor.name,
        token: token.name,
      }

    return {
      actor: game.i18n.localize('TKNHAB.ActorImg'),
      token: game.i18n.localize('TKNHAB.TokenImg'),
    }
  }
  /**
   * @typedef {Object} images
   * @property {string} actor - The image for the Actor
   * @property {string} token - The image for the Token
   *
   * Determin the correct image paths for either the token,
   * or the associated Actor.
   *
   * @static
   * @param {Token} token - The Token to get the path of.
   * @param {Actor} actor - The Actor to get the path of.
   * @return {images} The paths of the actor and token images.
   * @memberof ShowArt
   */
  static getTokenImages(token, actor) {
    const mystery = 'icons/svg/mystery-man.svg'
    const synthActor = token.actorData

    let actorImg = synthActor.img || actor.data.img
    let tokenImg = token.img

    const am = actorImg === mystery
    const tm = tokenImg === mystery

    if (!(am && tm)) {
      actorImg = am ? tokenImg : actorImg
      tokenImg = tm ? actorImg : tokenImg
    }

    return { actor: actorImg, token: tokenImg }
  }
  /**
   * Create the HTML elements for the HUD button
   * including the Font Awesome icon and tooltop.
   *
   * @static
   * @return {Element} The `<div>` element that is used as the HUD button.
   * @memberof ShowArt
   */
  static createButton() {
    let button = document.createElement('div')

    button.classList.add('control-icon')
    button.classList.add('artwork-open')
    button.innerHTML = `<i class="fas fa-user-shield"></i>`
    button.title = i18n('GURPS.setManeuver', 'Set Maneuver')

    return button
  }

  /**
   * Adds the keybinding to the selected tile.
   *
   * @static
   * @param {Tile} tile - The selected Tile.
   * @param {Boolean} control - Whether or not this Tile is being selected, or deselected.
   * @return {null} Early return if control is false.
   * @memberof ShowArt
   */
  static prepTileKeybinding(tile, control) {
    const doc = $(document)
    doc.off('keydown.showArt')
    if (!control) return

    doc.on('keydown.showArt', event => this.keyEventHandler(event, tile.data.img, game.i18n.localize('TKNHAB.TileImg')))
  }
  /**
   * Adds the keybinding to the selected token.
   *
   * @static
   * @param {Token} token - The selected Token.
   * @param {Boolean} control - Whether or not this Token is being selected, or deselected.
   * @return {null} Early return if control is false.
   * @memberof ShowArt
   */
  static prepTokenKeybinding(token, control) {
    const doc = $(document)
    doc.off('keydown.showArt')
    if (!control) return

    const actor = this.getTokenActor(token.data)
    const images = this.getTokenImages(token.data, actor)
    const titles = this.getTokenTitles(token.data, actor)

    doc.on('keydown.showArt', event =>
      this.keyEventHandler(
        event,
        event.key == 'Z' ? images.token : images.actor,
        event.key == 'Z' ? titles.token : titles.actor
      )
    )
  }
  /**
   * Adds the button to the Token HUD,
   * and attaches event listeners.
   *
   * @static
   * @param {TokenHUD} hud - The HUD object, not used.
   * @param {jQuery} html - The jQuery reference to the HUD HTML.
   * @param {Token} token - The data for the Token.
   * @memberof ShowArt
   */
  static prepTokenHUD(hud, html, token) {
    const actor = this.getTokenActor(token)
    const images = this.getTokenImages(token, actor)
    const titles = this.getTokenTitles(token, actor)
    const artButton = this.createButton()

    $(artButton)
      .click(event => this.buttonEventHandler(event, images.actor, titles.actor))
      .contextmenu(event => this.buttonEventHandler(event, images.token, titles.token))

    html.find('div.right').append(artButton)
  }
  /**
   * Adds the button to the Tile HUD,
   * and attaches event listeners.
   *
   * @static
   * @param {TileHUD} hud - The HUD object, not used.
   * @param {jQuery} html - The jQuery reference to the HUD HTML.
   * @param {Tile} token - The data for the Tile.
   * @memberof ShowArt
   */
  static prepTileHUD(hud, html, tile) {
    const artButton = this.createButton()

    $(artButton).click(event => this.buttonEventHandler(event, tile.img, game.i18n.localize('TKNHAB.TileImg')))
    html.find('div.left').append(artButton)
  }
}

/**
 * Capable of handling images, as well as .mp4 and .webm video
 * not very sophisticated.
 *
 * @class MultiMediaPopout
 * @extends {ImagePopout}
 */
class MultiMediaPopout extends ImagePopout {
  /**
   * Creates an instance of MultiMediaPopout.
   *
   * @param {string} src
   * @param {object} [options={}]
   * @memberof MultiMediaPopout
   */
  constructor(src, options = {}) {
    super(src, options)

    this.video = ['.mp4', 'webm'].includes(src.slice(-4).toLowerCase())

    this.options.template = 'modules/token-hud-art-button/media-popout.html'
  }

  /** @override */
  async getData(options) {
    let data = await super.getData()
    data.isVideo = this.video
    return data
  }
  /**
   * Share the displayed image with other connected Users
   */
  shareImage() {
    game.socket.emit('module.token-hud-art-button', {
      image: this.object,
      title: this.options.title,
      uuid: this.options.uuid,
    })
  }

  /**
   * Handle a received request to display media.
   *
   * @override
   * @param {string} image - The path to the image/media resource.
   * @param {string} title - The title for the popout title bar.
   * @param {string} uuid
   * @return {MultiMediaPopout}
   * @private
   */
  static _handleShareMedia({ image, title, uuid } = {}) {
    return new MultiMediaPopout(image, {
      title: title,
      uuid: uuid,
      shareable: false,
      editable: false,
    }).render(true)
  }
}

// Hooks.once('ready', () => {
//   game.socket.on('module.token-hud-art-button', MultiMediaPopout._handleShareMedia)
// })

// Hooks.on('controlTile', (...args) => ShowArt.prepTileKeybinding(...args))
// Hooks.on('controlToken', (...args) => ShowArt.prepTokenKeybinding(...args))

// Hooks.on('renderTileHUD', (...args) => ShowArt.prepTileHUD(...args))
// Hooks.on('renderTokenHUD', (...args) => ShowArt.prepTokenHUD(...args))

/*
token-hud .status-maneuvers.active {
    visibility: visible;
}
#token-hud .status-maneuvers {
    visibility: hidden;
    position: absolute;
    left: 65px;
    top: 0;
    display: grid;
    padding: 3px;
    box-sizing: content-box;
    width: 100px;
    grid-template-columns: 25px 25px 25px 25px;
    background: rgba(0, 0, 0, 0.6);
    box-shadow: 0 0 15px #000;
    border: 1px solid #333;
    border-radius: 4px;
    pointer-events: all;
}
*/
