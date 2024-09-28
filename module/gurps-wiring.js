import { parselink } from '../lib/parselink.js'
import { atou } from '../lib/utilities.js'
import { handleOnPdf } from './pdf-refs.js'
import GgaContextMenu from './utilities/contextmenu.js'
import { multiplyDice } from './utilities/damage-utils.js'

export default class GurpsWiring {
  static hookupAllEvents(html) {
    this.hookupGurps(html)
    this.hookupGurpsRightClick(html)
  }

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

    // Make any OtF element draggable
    html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        let display = ''
        if (!!ev.currentTarget.dataset.action) display = ev.currentTarget.innerText
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf'),
            displayname: display,
            encodedAction: ev.currentTarget.dataset.action,
          })
        )
      })
    })
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
    html.find('.gmod').on('contextmenu', GurpsWiring.onRightClickGmod)
    html.find('[data-otf]').on('contextmenu', GurpsWiring.onRightClickOtf)

    if (html.find('.pdflink').length > 0) {
      for (const link of html.find('.pdflink')) {
        this.createPdfLinkMenu(link)
      }
    }

    // html.find('.pdflink').on('contextmenu', event => {
    //   event.preventDefault()
    //   let el = event.currentTarget
    //   GURPS.whisperOtfToOwner('PDF:' + el.innerText, null, event, false, GURPS.LastActor)
    // })
  }

  static createPdfLinkMenu(link) {
    let text = link.innerText
    let parent = $(link).parent()

    let actor = GURPS.LastActor
    let users = actor?.getOwners()?.filter(u => !u.isGM) || []
    let otf = '[PDF:' + text + ']'
    let names = users.map(u => u.name).join(' ')

    let container = $(parent).closest('section.window-content')

    new GgaContextMenu(container, parent, '.pdflink', `Send PDF:${text}...`, [
      {
        name: 'To Everyone',
        icon: '<i class="fas fa-user-friends"></i>',
        callback: () => GURPS.sendOtfMessage(otf, false),
        condition: () => game.user.isGM,
      },
      {
        name: `Whisper to ${names}`,
        icon: '<i class="fas fa-user-secret"></i>',
        callback: () => GURPS.sendOtfMessage(otf, false, users),
        condition: () => game.user.isGM && users.length > 0,
      },
      {
        name: 'Copy to Chat',
        icon: '<i class="far fa-comment"></i>',
        callback: () => {
          $(document).find('#chat-message').val(otf)
        },
        condition: () => true,
      },
    ])
  }

  /**
   * @param {JQuery.MouseEventBase} event
   */
  static chatClickGurpslink(event) {
    GurpsWiring.handleGurpslink(event, GURPS.LastActor)
  }

  /**
   * @param {JQuery.ClickEvent} event
   */
  static chatClickGmod(event) {
    let element = event.currentTarget
    let desc = element.dataset.name
    GurpsWiring.handleGurpslink(event, GURPS.LastActor, desc)
  }

  /**
   * A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
   * and followed the On-the-Fly formulas. As such, we may already have an action block (base 64 encoded so we can handle
   * any text). If not, we will just re-parse the text looking for the action block.
   *
   * @param {JQuery.MouseEventBase} event
   * @param {import("./actor/actor.js").GurpsActor | null} actor
   * @param {undefined} [desc]
   * @param {undefined} [targets]
   */
  static handleGurpslink(event, actor, desc, options) {
    event.preventDefault()
    let element = event.currentTarget
    let action = element.dataset?.action // If we have already parsed
    if (!!action) action = JSON.parse(atou(action))
    else action = parselink(element.innerText, desc).action

    if (!action && element.dataset?.otf) action = parselink(element.dataset.otf, desc).action

    if (options?.combined) {
      action.formula = multiplyDice(action.formula, options.combined)
      // action.orig = multiplyDice(action.orig, options.combined)
    }

    GURPS.performAction(action, actor, event, options?.targets)
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
        GURPS.resolveDamageRoll(event, GURPS.LastActor, action.orig, action.overridetxt, game.user.isGM, true)
      else GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, GURPS.LastActor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
    }
  }

  static async onRightClickGmod(event) {
    event.preventDefault()
    let el = event.currentTarget
    let n = el.dataset.name
    let t = el.innerText
    GURPS.whisperOtfToOwner(t + ' ' + n, null, event, false, this.actor)
  }

  static async onRightClickOtf(event) {
    event.preventDefault()
    let el = event.currentTarget
    let isDamageRoll = el.dataset.hasOwnProperty('damage')
    let otf = event.currentTarget.dataset.otf

    if (isDamageRoll) {
      GURPS.resolveDamageRoll(event, this.actor, otf, null, game.user.isGM)
    } else {
      GURPS.whisperOtfToOwner(event.currentTarget.dataset.otf, null, event, !isDamageRoll, this.actor) // Can't blind roll damages (yet)
    }
  }
}
