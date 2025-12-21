import Maneuvers from '../actor/maneuver.js'
import { TokenActions } from '../token-actions.js'

/**
 * Add Maneuver Menu to Combat Tracker HTML.
 *
 * This is called on every render of the Combat Tracker.
 *
 * @param {*} html
 * @param {*} combatant
 * @param {*} token
 * @returns
 */
export const addManeuverMenu = async (html, combatant, token) => {
  if (!token?.actor) return html

  console.log('Adding Maneuver Menu to Combat Tracker for combatant:', combatant.id)

  // Determine current maneuver and icon.
  let actorManeuverName = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
  if (!actorManeuverName || actorManeuverName === 'undefined') actorManeuverName = 'do_nothing'
  const actorManeuver = Maneuvers.getManeuver(actorManeuverName)

  const currentManeuver = document.createElement('img')
  currentManeuver.className = 'token-effect maneuver-badge'
  currentManeuver.src = actorManeuver.icon

  // Update initiative tooltip.
  const initiative = combatant?.initiative
  const replacementText = initiative !== null ? initiative.toFixed(5) : 'N/A'
  currentManeuver.title = game.i18n.format('GURPS.combatTracker.initiative', { value: replacementText })

  // Add active class if initialized.
  if (typeof initiative === 'number') currentManeuver.classList.add('active')
  else currentManeuver.classList.remove('active')

  // Replace initiative span with maneuver image.
  const initiativeSpan = html.querySelector?.('.token-initiative')
  if (initiativeSpan) initiativeSpan.replaceWith(currentManeuver)

  // Build the maneuvers menu from template.
  const maneuvers = Maneuvers.getAll()
  const menuHtmlString = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/maneuver-menu.hbs',
    {
      combatant,
      maneuvers,
    }
  )

  // Convert HTML string to DOM element and append to html.
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = menuHtmlString
  html.appendChild(tempDiv.firstElementChild)

  // Prepare tooltip.
  const actions = await TokenActions.fromToken(token)
  const maxMove = actions.getMaxMove()
  const label = Maneuvers.getManeuver(actions.currentManeuver).label
  const allIcons = TokenActions.getManeuverIcons(actions.currentManeuver)
  const tooltipHtmlString = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/maneuver-button-tooltip.hbs',
    {
      label,
      maxMove,
      allIcons,
    }
  )

  // Convert tooltip HTML string to DOM element and append to html.
  const tooltipDiv = document.createElement('div')
  tooltipDiv.innerHTML = tooltipHtmlString
  html.appendChild(tooltipDiv.firstElementChild)

  return html
}

/**
 * Add Maneuver Menu Listeners to Combat Tracker.
 */
export const addManeuverListeners = () => {
  console.log('Adding Maneuver Menu Listeners to Combat Tracker')

  // const tracker = document.querySelector('#sidebar-content #combat .combat-tracker')

  if (document._handleManeuverBadgeContextMenu) {
    document.removeEventListener('contextmenu', document._handleManeuverBadgeContextMenu)
  }

  if (document._handleManeuverBadgeClick) {
    document.removeEventListener('click', document._handleManeuverBadgeClick)
  }

  if (document._handleManeuverMenuToggle) {
    document.removeEventListener('click', document._handleManeuverMenuToggle)
  }

  // Global click handler to hide menus
  document.addEventListener('click', event => {
    if (event.target.classList?.contains('maneuver-badge')) return
    if (!event.target.closest('.maneuver-select-info')) {
      document.querySelectorAll('.maneuver-combat-tracker-menu').forEach(menu => {
        menu.style.display = 'none'
      })
    }
  })

  // Context menu handler for "Do Nothing"
  const handleManeuverBadgeRightClick = async event => {
    // Ensure click is on the maneuver badge
    if (!event.target.classList.contains('maneuver-badge')) return

    {
      const combatantElement = event.target.closest('[class*="combatant"]')
      if (!combatantElement) return

      event.preventDefault()
      event.stopPropagation()

      const combatantId = combatantElement.dataset.combatantId
      const combatant = game.combat.combatants.get(combatantId)

      console.log('Setting maneuver to Do Nothing for combatant:', combatant.id)

      const doNothing = Maneuvers.getManeuver('do_nothing')
      const token = canvas.tokens.get(combatant.token.id)
      const currentManeuverName = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
      if (currentManeuverName === 'do_nothing') return
      await token.setManeuver(doNothing.flags.gurps.name)
    }
  }
  document.addEventListener('contextmenu', handleManeuverBadgeRightClick)
  document._handleManeuverBadgeContextMenu = handleManeuverBadgeRightClick

  // Menu item click handler
  const handleManeuverBadgeClick = async event => {
    const target = event.target.closest('.maneuver-select-info')
    if (!target) return

    {
      event.preventDefault()
      event.stopPropagation()

      console.log('Maneuver menu item clicked')

      // Hide all menus
      document.querySelectorAll('.maneuver-combat-tracker-menu').forEach(menu => {
        menu.style.display = 'none'
      })

      const menu = target.closest('.maneuver-combat-tracker-menu')
      const combatantId = menu?.dataset.combatantId
      const maneuverName = target.dataset.maneuver

      const combatant = game.combat.combatants.get(combatantId)
      const token = canvas.tokens.get(combatant.token.id)

      const currentManeuver = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
      if (currentManeuver === maneuverName) return

      await token.actor.update({
        'system.conditions.maneuver': maneuverName,
      })
      await token.setManeuver(maneuverName)

      await token.drawEffects()
    }
  }
  document.addEventListener('click', handleManeuverBadgeClick)
  document._handleManeuverBadgeClick = handleManeuverBadgeClick

  // Click handler to toggle menu
  const handleManeuverMenuToggle = event => {
    // Ensure click is on the maneuver badge
    if (!event.target.classList.contains('maneuver-badge')) return

    {
      const combatantElement = event.target.closest('[class*="combatant"]')
      if (!combatantElement) return

      event.preventDefault()
      event.stopPropagation()

      const combatantId = combatantElement.dataset.combatantId
      const combatant = game.combat.combatants.get(combatantId)

      console.log('Toggling maneuver menu for combatant:', combatant.id)

      const menu = event.target.parentElement.querySelector('.maneuver-combat-tracker-menu')
      if (menu) {
        menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none'
      }
    }
  }
  document.addEventListener('click', handleManeuverMenuToggle)
  document._handleManeuverMenuToggle = handleManeuverMenuToggle
}

function getCombatantFromEvent(event) {
  const combatantId = event.target.closest('[class*="combatant actor directory-item flexrow"]')?.dataset.combatantId
  const combatant = game.combat.combatants.get(combatantId)
  return combatant
}
