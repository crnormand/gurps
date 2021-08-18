import { parselink } from '../lib/parselink.js'
import { atou } from '../lib/utilities.js'
import { _game, _GURPS, _ui, _user } from './global-references.js'
import { handleOnPdf } from './pdf-refs.js'

export default class GurpsWiring {
  /**
   * Given a jquery html, attach all of our listeners to it. No need to call bind(), since they don't use "this".
   * @param {JQuery<HTMLElement>} html
   */
  static hookupGurps(html) {
    html.find('.gurpslink').on('click', GurpsWiring.chatClickGurpslink)
    html.find('.gmod').on('click', GurpsWiring.chatClickGmod)
    html.find('.glinkmod').on('click', GurpsWiring.chatClickGmod)
    html.find('.glinkmodplus').on('click', GurpsWiring.chatClickGmod)
    html.find('.glinkmodminus').on('click', GurpsWiring.chatClickGmod)
    html.find('.pdflink').on('click', handleOnPdf)
  }

  /**
   * @param {JQuery<HTMLElement>} html
   */
  static hookupGurpsRightClick(html) {
    html.find('a.gurpslink').on('contextmenu', GurpsWiring.onRightClickGurpslink)
    html.find('.gurpslink').on('contextmenu', GurpsWiring.onRightClickGurpslink)
    html.find('.glinkmod').on('contextmenu', GurpsWiring.onRightClickGurpslink)
    html.find('.glinkmodplus').on('contextmenu', GurpsWiring.onRightClickGurpslink)
    html.find('.glinkmodminus').on('contextmenu', GurpsWiring.onRightClickGurpslink)
    html.find('.pdflink').on('contextmenu', event => {
      event.preventDefault()
      let el = event.currentTarget
      _GURPS().whisperOtfToOwner('PDF:' + el.innerText, null, event, false, _GURPS().LastActor)
    })
  }

  /**
   * @param {JQuery.MouseEventBase} event
   */
  static chatClickGurpslink(event) {
    GurpsWiring.handleGurpslink(event, _GURPS().LastActor)
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  static chatClickGmod(event) {
    let element = event.currentTarget
    let desc = element.dataset.name
    GurpsWiring.handleGurpslink(event, _GURPS().LastActor, desc)
  }

  /**
   * A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
   * and followed the On-the-Fly formulas. As such, we may already have an action block (base 64 encoded so we can handle
   * any text). If not, we will just re-parse the text looking for the action block.
   *
   * @param {JQuery.MouseEventBase} event
   * @param {import("./actor/actor").GurpsActor | null} actor
   * @param {undefined} [desc]
   * @param {undefined} [targets]
   */
  static handleGurpslink(event, actor, desc, targets) {
    event.preventDefault()
    let element = event.currentTarget
    let action = element.dataset.action // If we have already parsed
    if (!!action) action = JSON.parse(atou(action))
    else action = parselink(element.innerText, desc).action
    _GURPS().performAction(action, actor, event, targets)
  }

  /**
   * @param {JQuery.ContextMenuEvent} event
   */
  static onRightClickGurpslink(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action
    if (!!action) {
      action = JSON.parse(atou(action))
      if (action.type === 'damage' || action.type === 'deriveddamage')
        _GURPS().resolveDamageRoll(event, _GURPS().LastActor, action.orig, action.overridetxt, _user().isGM, true)
      else _GURPS().whisperOtfToOwner(action.orig, action.overridetxt, event, action, _GURPS().LastActor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
    }
  }
}
