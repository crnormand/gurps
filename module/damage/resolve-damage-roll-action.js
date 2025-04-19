import GurpsWiring from '../gurps-wiring.js'
import { multiplyDice } from '../utilities/damage-utils.js'

export function resolveDamageRollAction(event, actor, otf, overridetxt, isGM, isOtf = false) {
  let title = game.i18n.localize('GURPS.RESOLVEDAMAGETitle')
  let prompt = game.i18n.localize('GURPS.RESOLVEDAMAGEPrompt')
  let quantity = game.i18n.localize('GURPS.RESOLVEDAMAGEQuantity')
  let sendTo = game.i18n.localize('GURPS.RESOLVEDAMAGESendTo')
  let multiple = game.i18n.localize('GURPS.RESOLVEDAMAGEMultiple')

  /** @type {Record<string,Dialog.Button>} */
  let buttons = {}

  if (isGM) {
    buttons.send = {
      icon: '<i class="fas fa-paper-plane"></i>',
      label: `${sendTo}`,
      callback: () => GURPS.whisperOtfToOwner(otf, overridetxt, event, false, actor), // Can't blind roll damages (yet)
    }
  }

  buttons.multiple = {
    icon: '<i class="fas fa-clone"></i>',
    label: `${multiple}`,
    callback: html => {
      // @ts-ignore
      let text = /** @type {string} */ (html.find('#number-rolls').val())
      let number = parseInt(text)
      let targets = []
      for (let index = 0; index < number; index++) {
        targets[index] = `${index + 1}`
      }
      if (isOtf) GurpsWiring.handleGurpslink(event, actor, null, { targets: targets })
      else GURPS.handleRoll(event, actor, { targets: targets })
    },
  }

  buttons.combined = {
    icon: '<i class="fas fa-plus"></i>',
    label: game.i18n.localize('GURPS.RESOLVEDAMAGEAdd'),
    callback: html => {
      let text = /** @type {string} */ (html.find('#number-rolls').val())
      let number = parseInt(text)

      if (isOtf) otf = multiplyDice(otf, number)

      if (isOtf) GurpsWiring.handleGurpslink(event, actor, null, { combined: number })
      else GURPS.handleRoll(event, actor, { combined: number })
    },
  }
  let def = GURPS.lastTargetedRoll?.rofrcl || 2
  let dlg = new Dialog({
    title: `${title}`,
    content: `
        <div style='display: flex; flex-flow: column nowrap; place-items: center;'>
          <p style='font-size: large;'><strong>${otf}</strong></p>
          <p>${prompt}</p>
          <div style='display: inline-grid; grid-template-columns: auto 1fr; place-items: center; gap: 4px'>
            <label>${quantity}</label>
            <input type='text' id='number-rolls' class='digits-only' style='text-align: center;' value='${def}'>
          </div>
          <p/>
        </div>
        `,
    buttons: buttons,
    default: 'send',
  })
  dlg.render(true)
}
