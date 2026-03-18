import { parselink } from '../lib/parselink.js'
import { atou } from '../lib/utilities.js'
import { multiplyDice } from './utilities/damage-utils.js'

export default class GurpsWiring {
  /**
   * Attach standard click and context menu event handlers to any element that qualifies as a "gurpslink", "gmod", "glinkmod",
   * "glinkmodplus", "glinkmodminus", or "pdflink". Also make any element with a "data-otf" attribute draggable and attach a
   * context menu to it.
   * @param {*} html - a JQuery element to search within for elements to attach click handlers to.
   */
  static hookupAllEvents(html) {
    html
      .find('.gurpslink, .gmod, .glinkmod, .glinkmodplus, .glinkmodminus, .pdflink, [data-otf]')
      .each((_, element) => {
        this.#hookupGurpsClick(element)
        this.#hookupGurpsContextMenu(element)
      })
  }

  /**
   * Attach standard click event handlers to any element that qualifies as a "gurpslink", "gmod", "glinkmod",
   * "glinkmodplus", "glinkmodminus", or "pdflink". Also make any element with a "data-otf" attribute draggable.
   * @param {*} html - a JQuery element to search within for elements to attach click handlers to.
   */
  static hookupClickEvents(html) {
    html
      .find('.gurpslink, .gmod, .glinkmod, .glinkmodplus, .glinkmodminus, .pdflink, [data-otf]')
      .each((_, element) => {
        this.#hookupGurpsClick(element)
      })
  }

  static #hookupGurpsClick(element) {
    // In case we are rendering the same html multiple times, we may have already wired up some of the elements. To
    // avoid wiring them up twice, we will check for the presence of the "data-gurps-clickwired" attribute. If it is
    // not present, we will wire up the element and set the attribute to true.
    if (element.hasAttribute('data-gurps-clickwired')) return

    element.setAttribute('data-gurps-clickwired', 'true')

    if (element.classList.contains('gurpslink')) {
      element.addEventListener('click', GurpsWiring.chatClickGurpslink)
    } else if (
      element.classList.contains('gmod') ||
      element.classList.contains('glinkmod') ||
      element.classList.contains('glinkmodplus') ||
      element.classList.contains('glinkmodminus')
    ) {
      element.addEventListener('click', GurpsWiring.chatClickGmod)
    } else if (element.classList.contains('pdflink')) {
      element.addEventListener('click', GURPS.modules.Pdf.handleOnPdf)
    }

    if (element.hasAttribute('data-otf')) {
      // Make any OtF element draggable.
      element.setAttribute('draggable', true)
      element.addEventListener('dragstart', ev => {
        let display = ''
        if (!!ev.currentTarget.dataset.action) display = ev.currentTarget.innerText
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: element.getAttribute('data-otf'),
            displayname: display,
            encodedAction: ev.currentTarget.dataset.action,
          })
        )
      })
    }
  }

  /**
   * Given a jquery html, attach all of our listeners to it. No need to call bind(), since they don't use "this".
   */
  static #hookupGurpsContextMenu(element) {
    // In case we are rendering the same html multiple times, we may have already wired up some of the elements. To
    // avoid wiring them up twice, we will check for the presence of the "data-gurps-contextmenuwired" attribute. If it
    // is not present, we will wire up the element and set the attribute to true.
    if (element.hasAttribute('data-gurps-contextmenuwired')) return

    element.setAttribute('data-gurps-contextmenuwired', 'true')

    if (element.classList.contains('gurpslink')) {
      element.addEventListener('contextmenu', GurpsWiring.onRightClickGurpslink)
    } else if (element.classList.contains('gmod')) {
      // TODO Why do we have a separate right click handler for gmod vs glinkmod? Can we unify them?
      element.addEventListener('contextmenu', GurpsWiring.onRightClickGmod)
    } else if (
      element.classList.contains('glinkmod') ||
      element.classList.contains('glinkmodplus') ||
      element.classList.contains('glinkmodminus')
    ) {
      element.addEventListener('contextmenu', GurpsWiring.onRightClickGurpslink)
    } else if (element.classList.contains('pdflink')) {
      GurpsWiring.#createPdfLinkMenu(element)
    } else if (element.hasAttribute('data-otf')) {
      element.addEventListener('contextmenu', GurpsWiring.onRightClickOtf)
    }
  }

  static #createPdfLinkMenu(link) {
    const options = {
      fixed: true,
    }
    if (link instanceof HTMLElement) options.JQuery = false

    let users = GURPS.LastActor?.getOwners()?.filter(u => !u.isGM) || []
    let names = users.map(u => u.name).join(' ')

    // COMPATIBILITY: v12
    // new foundry.applications.ux.ContextMenu(container, selector, menuItems)
    new ContextMenu(
      link,
      '.pdflink',
      [
        {
          name: 'GURPS.sendToEveryone',
          icon: '<i class="fas fa-user-friends"></i>',
          callback: () => GURPS.sendOtfMessage('[PDF:' + link.innerText + ']', false),
          condition: () => game.user.isGM,
        },
        {
          name: game.i18n.format('GURPS.whisperToNames', { names }),
          icon: '<i class="fas fa-user-secret"></i>',
          callback: () => GURPS.sendOtfMessage('[PDF:' + link.innerText + ']', false, users),
          condition: () => {
            return game.user.isGM && users.length > 0
          },
        },
        {
          name: 'GURPS.sendToChat',
          icon: '<i class="far fa-comment"></i>',
          callback: () => {
            $(document)
              .find('#chat-message')
              .val('[PDF:' + link.innerText + ']')
          },
          condition: () => true,
        },
      ],
      options
    )
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
   * @param {JQuery.ContextMenuEvent} event
   */
  static onRightClickGurpslink(event) {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action
    if (!!action) {
      action = JSON.parse(atou(action))
      // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
      if (action.type === 'damage' || action.type === 'deriveddamage' || action.type === 'attackdamage')
        GURPS.resolveDamageRoll(event, GURPS.LastActor, action.orig, action.overridetxt, game.user.isGM, true)
      else GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, GURPS.LastActor)
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
