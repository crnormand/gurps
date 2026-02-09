import GurpsWiring from '../gurps-wiring.js'
import { multiplyDice } from '../util/damage-utils.ts'

export async function resolveDamageRollAction(event, actor, otf, overridetxt, isGM, isOtf = false) {
  const buttons = []

  if (isGM) {
    buttons.push({
      action: 'send',
      label: 'GURPS.resolveDamage.sendTo',
      icon: 'fas fa-paper-plane',
      callback: (event, button) => {
        const rolls = button.form.elements.number?.valueAsNumber || 1

        return { rolls: rolls, action: 'send' }
      },
    })
  }

  buttons.push({
    action: 'multiple',
    label: 'GURPS.resolveDamage.multiple',
    icon: 'fas fa-clone',
    callback: (event, button) => {
      return { rolls: button.form.elements.number?.valueAsNumber, action: 'multiple' }
    },
  })

  buttons.push({
    action: 'combine',
    label: 'GURPS.resolveDamage.combine',
    icon: 'fas fa-plus',
    callback: (event, button) => {
      return { rolls: button.form.elements.number?.valueAsNumber, action: 'combine' }
    },
  })

  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: game.i18n.localize('GURPS.resolveDamage.title') },
    content: await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/apply-damage/resolve-damage-roll.hbs',
      {
        otf: otf,
        rolls: 2,
        def: GURPS.lastTargetedRoll?.rofrcl || 2,
      }
    ),
    buttons: buttons,
    default: 'send',
  })

  switch (choice?.action) {
    case 'send':
      GURPS.whisperOtfToOwner(otf, overridetxt, event, false, actor) // Can't blind roll damages (yet)
      break
    case 'multiple': {
      const rolls = choice.rolls || 1
      let targets = Array.from({ length: rolls }, (_, i) => (i + 1).toString())

      if (isOtf) GurpsWiring.handleGurpslink(event, actor, { targets: targets })
      else GURPS.handleRoll(event, actor, { targets: targets })
      break
    }
    case 'combine': {
      const rolls = choice.rolls || 1

      if (isOtf) otf = multiplyDice(otf, rolls)
      if (isOtf) GurpsWiring.handleGurpslink(event, actor, { combined: rolls })
      else GURPS.handleRoll(event, actor, { combined: rolls })
      break
    }
  }
}
