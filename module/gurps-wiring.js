import { parselink } from '../lib/parselink.js'
import { atou } from '../lib/utilities.js'
import { GgaContextMenuV2 } from './ui/context-menu.js'
import { multiplyDice } from './utilities/damage-utils.js'

export default class GurpsWiring {
  static hookupAllEvents(html) {
    // Convert jQuery to HTMLElement if needed for backward compatibility
    if (html instanceof jQuery) html = html[0]

    GurpsWiring.hookupGurps(html)
    GurpsWiring._hookupGurpsRightClick(html)
  }

  /**
   * Given an HTMLElement, attach all of our listeners to it. No need to call bind(), since they don't use "this".
   * @param {HTMLElement} html
   */
  static hookupGurps(html) {
    html.querySelectorAll('.gurpslink').forEach(el => el.addEventListener('click', GurpsWiring._chatClickGurpslink))
    html.querySelectorAll('.gmod').forEach(el => el.addEventListener('click', GurpsWiring._chatClickGmod))
    html.querySelectorAll('.glinkmod').forEach(el => el.addEventListener('click', GurpsWiring._chatClickGmod))
    html.querySelectorAll('.glinkmodplus').forEach(el => el.addEventListener('click', GurpsWiring._chatClickGmod))
    html.querySelectorAll('.glinkmodminus').forEach(el => el.addEventListener('click', GurpsWiring._chatClickGmod))
    html.querySelectorAll('.pdflink').forEach(el => el.addEventListener('click', GURPS.modules.Pdf.handleOnPdf))

    // Make any OtF element draggable
    html.querySelectorAll('[data-otf]').forEach(li => {
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
   * @param {HTMLElement} html
   */
  static _hookupGurpsRightClick(html) {
    html
      .querySelectorAll('a.gurpslink')
      .forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGurpslink))
    html
      .querySelectorAll('.gurpslink')
      .forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGurpslink))
    html
      .querySelectorAll('.glinkmod')
      .forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGurpslink))
    html
      .querySelectorAll('.glinkmodplus')
      .forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGurpslink))
    html
      .querySelectorAll('.glinkmodminus')
      .forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGurpslink))
    html.querySelectorAll('.gmod').forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickGmod))
    html.querySelectorAll('[data-otf]').forEach(el => el.addEventListener('contextmenu', GurpsWiring._onRightClickOtf))

    const pdfLinks = html.querySelectorAll('.pdflink')
    if (pdfLinks.length > 0) {
      for (const link of pdfLinks) {
        GurpsWiring._createPdfLinkMenu(link)
      }
    }
  }

  static _createPdfLinkMenu(link) {
    console.assert(link instanceof HTMLElement)
    let text = link.innerText
    let target = link.parentElement

    let actor = GURPS.LastActor
    let users = actor?.getOwners()?.filter(u => !u.isGM) || []
    let otf = '[PDF:' + text + ']'
    let names = users.map(u => u.name).join(' ')

    let container = target.closest('section.window-content')

    new GgaContextMenuV2(
      target,
      '.pdflink',
      [
        {
          name: game.i18n.format('GURPS.contextmenu.pdf.sendToEveryone', { text: text }),
          icon: '<i class="fas fa-user-friends"></i>',
          callback: () => GURPS.sendOtfMessage(otf, false),
          condition: () => game.user.isGM,
        },
        {
          name: game.i18n.format('GURPS.contextmenu.pdf.whisperToOwners', { text: text, owners: names }),
          icon: '<i class="fas fa-user-secret"></i>',
          callback: () => GURPS.sendOtfMessage(otf, false, users),
          condition: () => game.user.isGM && users.length > 0,
        },
        {
          name: game.i18n.format('GURPS.contextmenu.pdf.copyToChat', { text: text }),
          icon: '<i class="far fa-comment"></i>',
          callback: () => {
            $(document).find('#chat-message').val(otf)
          },
          condition: () => true,
        },
      ],
      container
    )
  }

  /**
   * @param {Event} event
   */
  static _chatClickGurpslink(event) {
    GurpsWiring.handleGurpslink(event, GURPS.LastActor)
  }

  /**
   * @param {Event} event
   */
  static _chatClickGmod(event) {
    let element = event.currentTarget
    let desc = element.dataset.name
    GurpsWiring.handleGurpslink(event, GURPS.LastActor, desc)
  }

  /**
   * A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
   * and followed the On-the-Fly formulas. As such, we may already have an action block (base 64 encoded so we can handle
   * any text). If not, we will just re-parse the text looking for the action block.
   *
   * @param {Event} event
   */
  static handleGurpslink(event, actor, options) {
    event.preventDefault()
    let element = event.currentTarget
    let action = element.dataset?.action // If we have already parsed
    if (!!action) action = JSON.parse(atou(action))
    else action = parselink(element.innerText).action

    if (!action && element.dataset?.otf) action = parselink(element.dataset.otf).action

    if (options?.combined) {
      action.formula = multiplyDice(action.formula, options.combined)
      action.costs = action.costs
        ? action.costs.replace(
            /(\*cost|\*costs)\s+(\d+)\s*(\S+)/gi,
            (match, p1, p2, p3) => `${p1} ${parseInt(p2) * options.combined}${p3}`
          )
        : undefined
    }

    GURPS.performAction(action, actor, event, options?.targets)
  }

  /**
   * @param {Event} event
   */
  static _onRightClickGurpslink(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action
    if (!!action) {
      action = JSON.parse(atou(action))
      if (action.type === 'damage' || action.type === 'deriveddamage' || action.type === 'attackdamage')
        GURPS.resolveDamageRoll(event, GURPS.LastActor, action.orig, action.overridetxt, game.user.isGM, true)
      else GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, GURPS.LastActor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
    }
  }

  static async _onRightClickGmod(event) {
    event.preventDefault()
    let el = event.currentTarget
    let n = el.dataset.name
    let t = el.innerText
    GURPS.whisperOtfToOwner(t + ' ' + n, null, event, false, this.actor)
  }

  static async _onRightClickOtf(event) {
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
