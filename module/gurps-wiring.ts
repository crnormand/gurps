import { parselink } from '../lib/parselink.js'
import { atou } from '../lib/utilities.js'

import { GgaContextMenuV2 } from './ui/context-menu.js'
import { multiplyDice } from './utilities/damage-utils.js'
import { getGame, getUser, isHTMLElement } from './utilities/guards.js'

interface HandleGurpslinkOptions {
  combined?: number
  targets?: string[]
}

export default class GurpsWiring {
  static hookupAllEvents(html: HTMLElement): void {
    GurpsWiring.hookupGurps(html)
    GurpsWiring._hookupGurpsRightClick(html)
  }

  /**
   * Given an HTMLElement, attach all of our listeners to it.
   */
  static hookupGurps(html: HTMLElement): void {
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

        if (ev.currentTarget.dataset.action) display = ev.currentTarget.innerText

        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: element.getAttribute('data-otf'),
            displayname: display,
            encodedAction: target.dataset.action,
          })
        )
      })
    })
  }

  private static _hookupGurpsRightClick(html: HTMLElement): void {
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
        if (isHTMLElement(link)) {
          GurpsWiring._createPdfLinkMenu(link)
        }
      }
    }
  }

  private static _createPdfLinkMenu(link: HTMLElement): void {
    const text = link.innerText
    const target = link.parentElement

    let actor = GURPS.LastActor
    let users = actor?.getOwners()?.filter(user => !user.isGM) || []
    let otf = '[PDF:' + text + ']'
    let names = users.map(user => user.name).join(' ')

    const actor = GURPS.LastActor
    const users = actor?.getOwners()?.filter((u: User) => !u.isGM) ?? []
    const otf = '[PDF:' + text + ']'
    const names = users.map((u: User) => u.name).join(' ')

    const container = target.closest<HTMLElement>('section.window-content')

    new GgaContextMenuV2(
      target,
      '.pdflink',
      [
        {
          name: getGame().i18n.format('GURPS.contextmenu.pdf.sendToEveryone', { text }),
          icon: '<i class="fas fa-user-friends"></i>',
          callback: () => GURPS.sendOtfMessage(otf, false),
          condition: () => getUser().isGM,
        },
        {
          name: getGame().i18n.format('GURPS.contextmenu.pdf.whisperToOwners', { text, owners: names }),
          icon: '<i class="fas fa-user-secret"></i>',
          callback: () => GURPS.sendOtfMessage(otf, false, users),
          condition: () => getUser().isGM && users.length > 0,
        },
        {
          name: getGame().i18n.format('GURPS.contextmenu.pdf.copyToChat', { text }),
          icon: '<i class="far fa-comment"></i>',
          callback: () => {
            const chatInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('#chat-message')

            if (chatInput) chatInput.value = otf
          },
          condition: () => true,
        },
      ],
      container
    )
  }

  private static _chatClickGurpslink(event: Event): void {
    GurpsWiring.handleGurpslink(event, GURPS.LastActor)
  }

  /**
   * @param {Event} event
   */
  static _chatClickGmod(event) {
    GurpsWiring.handleGurpslink(event, GURPS.LastActor)
  }

  /**
   * A user has clicked on a "gurpslink", so we can assume that it previously qualified as a "gurpslink"
   * and followed the On-the-Fly formulas. As such, we may already have an action block (base 64 encoded so we can handle
   * any text). If not, we will just re-parse the text looking for the action block.
   */
  static handleGurpslink(event: Event, actor: Actor.Implementation | null, options?: HandleGurpslinkOptions): void {
    event.preventDefault()
    let element = event.currentTarget
    let action = element.dataset?.action // If we have already parsed

    if (action) action = JSON.parse(atou(action))
    else action = parselink(element.innerText).action

    if (!action && element.dataset?.otf) action = parselink(element.dataset.otf).action

    if (options?.combined && action) {
      const multiplier = options.combined

      action.formula = multiplyDice(action.formula, multiplier)
      action.costs = action.costs
        ? action.costs.replace(
            /(\*cost|\*costs)\s+(\d+)\s*(\S+)/gi,
            (_match: string, p1: string, p2: string, p3: string) => `${p1} ${parseInt(p2) * multiplier}${p3}`
          )
        : undefined
    }

    GURPS.performAction(action, actor, event, options?.targets)
  }

  private static _onRightClickGurpslink(event: Event): void {
    event.preventDefault()
    event.stopImmediatePropagation() // Since this may occur in note or a list (which has its own RMB handler)
    let el = event.currentTarget
    let action = el.dataset.action

    if (action) {
      action = JSON.parse(atou(action))
      if (action.type === 'damage' || action.type === 'deriveddamage' || action.type === 'attackdamage')
        GURPS.resolveDamageRoll(event, GURPS.LastActor, action.orig, action.overridetxt, game.user.isGM, true)
      else GURPS.whisperOtfToOwner(action.orig, action.overridetxt, event, action, GURPS.LastActor) // only offer blind rolls for things that can be blind, No need to offer blind roll if it is already blind
    }
  }

  private static _onRightClickGmod(event: Event): void {
    event.preventDefault()
    let el = event.currentTarget
    let name = el.dataset.name
    let text = el.innerText

    GURPS.whisperOtfToOwner(text + ' ' + name, null, event, false, this.actor)
  }

  private static _onRightClickOtf(event: Event): void {
    event.preventDefault()
    let el = event.currentTarget
    let isDamageRoll = Object.hasOwn(el.dataset, 'damage')
    let otf = event.currentTarget.dataset.otf

    if (isDamageRoll) {
      GURPS.resolveDamageRoll(event, GURPS.LastActor, otf, null, getUser().isGM)
    } else {
      GURPS.whisperOtfToOwner(otf, null, event, !isDamageRoll, GURPS.LastActor)
    }
  }
}
