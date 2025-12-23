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

  // Determine current maneuver and icon.
  let actorManeuverName = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
  if (!actorManeuverName || actorManeuverName === 'undefined') actorManeuverName = 'do_nothing'
  const actorManeuver = Maneuvers.getManeuver(actorManeuverName)

  const currentManeuver = document.createElement('img')
  currentManeuver.className = 'token-effect maneuver-badge'
  currentManeuver.src = actorManeuver.icon

  // Add active class if initialized.
  const initiative = combatant?.initiative
  if (typeof initiative === 'number') currentManeuver.classList.add('active')
  else currentManeuver.classList.remove('active')

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

  currentManeuver.setAttribute('aria-label', 'Maneuver Badge')
  currentManeuver.setAttribute('data-tooltip-html', tooltipHtmlString)

  // Context menu handler for "Do Nothing"
  currentManeuver.addEventListener(
    'contextmenu',
    async event => {
      event.preventDefault()
      event.stopPropagation()

      const combatantElement = event.target.closest('.combatant')
      if (!combatantElement) return

      const combatantId = combatantElement.dataset.combatantId
      if (!combatantId || !game.combat) return

      const combatant = game.combat.combatants.get(combatantId)
      if (!combatant || !combatant.token) return

      const doNothing = Maneuvers.getManeuver('do_nothing')
      const token = canvas?.tokens?.get(combatant.token.id)
      if (!token || !token.actor) return
      const currentManeuverName = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
      if (currentManeuverName === 'do_nothing') return
      await token.setManeuver(doNothing.flags.gurps.name)
    },
    { once: true }
  )

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

  // Find the maneuver token-effect and remove it and its tooltip entry.
  const tokenEffects = html.querySelector('.token-effects')
  const tooltipHtmlRaw = tokenEffects?.getAttribute('data-tooltip-html')
  if (tokenEffects && tooltipHtmlRaw) {
    const tempTooltipContainer = document.createElement('div')
    tempTooltipContainer.innerHTML = tooltipHtmlRaw.toString()

    const tooltipListItems = tempTooltipContainer.querySelectorAll('li')
    tooltipListItems.forEach(li => {
      const text = li.textContent || ''
      if (text.toLowerCase().includes('maneuvers')) {
        li.remove()
      }
    })

    const cleanedTooltipHtml = tempTooltipContainer.innerHTML
    tokenEffects.setAttribute('data-tooltip-html', cleanedTooltipHtml)
  }
  const maneuverEffect = tokenEffects?.querySelector(`img.token-effect[src*="/maneuvers/"]`)
  if (maneuverEffect) maneuverEffect.remove()

  // Finally, set the token image tooltip content.
  const image = html.querySelector?.('.token-image')
  if (image) {
    image.setAttribute('aria-label', 'Token Image')

    const replacementText = typeof initiative === 'number' ? initiative.toFixed(5) : 'N/A'
    image.setAttribute('data-tooltip', game.i18n.format('GURPS.combatTracker.initiative', { value: replacementText }))
  }

  return html
}

/**
 * Add Maneuver Menu Listeners to Combat Tracker.
 */
export const addManeuverListeners = () => {
  // Global click handler to hide menus
  document.addEventListener('click', event => {
    if (event.target.classList?.contains('maneuver-badge') || event.target.closest('.maneuver-select-info')) return
    document.querySelectorAll('.maneuver-combat-tracker-menu').forEach(menu => {
      menu.style.display = 'none'
      menu.closest('.combatant').querySelector('.maneuver-badge').classList.remove('open')
    })
  })

  // Menu item click handler
  document.addEventListener('click', async event => {
    const target = event.target.closest('.maneuver-select-info')
    if (!target) return

    const badge = event.target.closest('.maneuver-badge')

    event.preventDefault()
    event.stopPropagation()

    // Hide all menus
    document.querySelectorAll('.maneuver-combat-tracker-menu').forEach(menu => {
      menu.style.display = 'none'
      menu.closest('.combatant').querySelector('.maneuver-badge').classList.remove('open')
    })

    const menu = target.closest('.maneuver-combat-tracker-menu')
    const combatantId = menu?.dataset.combatantId
    const maneuverName = target.dataset.maneuver

    if (!game.combat || !combatantId) return
    const combatant = game.combat.combatants.get(combatantId)
    if (!combatant || !combatant.token?.id) return

    const token = canvas.tokens?.get(combatant.token.id)
    if (!token?.actor) return
    const currentManeuver = foundry.utils.getProperty(token.actor, 'system.conditions.maneuver')
    if (currentManeuver === maneuverName) return

    await token.setManeuver(maneuverName)
    await token.drawEffects()
    ui.combat?.render()
  })

  // Click handler to toggle menu
  document.addEventListener('click', event => {
    // Ensure click is on the maneuver badge
    if (!event.target.classList.contains('maneuver-badge')) return
    const badge = event.target

    const combatantElement = badge.closest('.combatant')
    if (!combatantElement) return

    event.preventDefault()
    event.stopPropagation()

    // Close all the menus. We'll toggle the clicked one after.
    document.querySelectorAll('.maneuver-combat-tracker-menu').forEach(menu => {
      menu.style.display = 'none'
      menu.closest('.combatant').querySelector('.maneuver-badge').classList.remove('open')
    })

    const menu = badge.parentElement.querySelector('.maneuver-combat-tracker-menu')
    if (menu) {
      if (menu.style.display === 'block') {
        menu.style.display = 'none'
        badge.classList.remove('open')
        return
      } else {
        menu.style.display = 'block'
        badge.classList.add('open')
      }

      if (menu.style.display === 'none') return
      // Set menu top to badge bottom
      const badgeRect = badge.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()

      if (badgeRect.bottom + menuRect.height > window.innerHeight) {
        menu.style.top = `${badgeRect.top - menuRect.height}px`
      } else {
        menu.style.top = `${badgeRect.bottom}px`
      }
    }
  })
}
