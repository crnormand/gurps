import Maneuvers from '../actor/maneuver.js'
import { TokenActions } from '../token-actions.js'

export const addManeuverMenu = async (html, combatant, token) => {
  // If token doesn't have an actor, return
  if (!token?.actor) return html
  // Find Current Maneuver element
  const tokenEffectsDiv = $(html).find('.token-effects')
  let currentManeuver = null
  tokenEffectsDiv.find('img').each(function () {
    const imgSrc = $(this).attr('src')
    if (imgSrc.includes('maneuvers')) {
      currentManeuver = $(this)
      return false
    }
  })

  let actorManeuverName = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
  if (!actorManeuverName || actorManeuverName === 'undefined') actorManeuverName = 'do_nothing'
  const actorManeuver = Maneuvers.getManeuver(actorManeuverName)

  if (!currentManeuver) {
    currentManeuver = $(`<img class="token-effect maneuver-badge" src="${actorManeuver.icon}" />`)
  }

  // Add Maneuver Badge and Menu
  const initiativeSpan = $(html).find('.token-initiative .initiative')
  initiativeSpan.replaceWith(currentManeuver)
  currentManeuver.addClass('maneuver-badge')
  const maneuvers = Maneuvers.getAll()

  const menuHtml = await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/maneuver-menu.hbs', {
    combatant,
    maneuvers,
  })
  const menu = $(menuHtml)
  $(html).append(menu)

  currentManeuver.on('click', function (event) {
    event.preventDefault()
    event.stopPropagation()
    const menu = $(this).parent().siblings('.maneuver-combat-tracker-menu')
    menu.toggle()
  })

  currentManeuver.on('contextmenu', async function (event) {
    event.preventDefault()
    event.stopPropagation()
    const doNothing = Maneuvers.getManeuver('do_nothing')
    const combatantId = $(this).closest('[class*="combatant actor directory-item flexrow"]').data('combatant-id')
    const combatant = game.combat.combatants.get(combatantId)
    const token = canvas.tokens.get(combatant.token.id)

    const currentManeuver = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
    if (currentManeuver === 'do_nothing') return
    await token.actor.update({
      'system.conditions.maneuver': doNothing.flags.gurps.name,
    })
    await token.setManeuver(doNothing.flags.gurps.name)
  })

  // Prepare tooltip
  const actions = await TokenActions.fromToken(token)
  const maxMove = actions.getMaxMove()
  const label = Maneuvers.getManeuver(actions.currentManeuver).label
  const allIcons = TokenActions.getManeuverIcons(actions.currentManeuver)
  const maneuverTooltip = $(
    await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/maneuver-button-tooltip.hbs', {
      label,
      maxMove,
      allIcons,
    })
  )
  $(html).append(maneuverTooltip)

  return html
}

export const addManeuverListeners = () => {
  $(document)
    .off('click', '.maneuver-select-info')
    .on('click', '.maneuver-select-info', async function (event) {
      event.preventDefault()
      event.stopPropagation()
      $('.maneuver-combat-tracker-menu').hide()

      const combatantId = $(this).closest('.maneuver-combat-tracker-menu').data('combatant-id')
      const maneuverName = $(this).data('maneuver')

      const combatant = game.combat.combatants.get(combatantId)
      const token = canvas.tokens.get(combatant.token.id)

      const currentManeuver = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
      if (currentManeuver === maneuverName) return

      await token.actor.update({
        'system.conditions.maneuver': maneuverName,
      })
      await token.setManeuver(maneuverName)

      await token.drawEffects()
    })

  $(document).on('click', function () {
    $('.maneuver-combat-tracker-menu').hide()
  })
}
