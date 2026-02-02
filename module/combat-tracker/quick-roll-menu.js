import * as Settings from '../../lib/miscellaneous-settings.js'
import { TokenActions } from '../token-actions.js'

export const addQuickRollButton = async (html, combatant, token) => {
  const quickRollSettings = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS)
  const canShowButtons = quickRollSettings.enabled && (game.user.isGM || combatant.isOwner)

  if (!canShowButtons || !token?.actor) return html

  const buttonClass = `combatant-control`
  let quickRollButton = $(
    `<a class="${buttonClass}"
          aria-label="Quick Roll" 
          role="button" 
          data-control="quickRollMenu"
          data-combatant-id="${combatant.id}" 
          data-tooltip="GURPS.quickRollMenu"
          id="quick-roll-${combatant.id}">
          <i class="fa-solid fa-dice-five"></i>`
  )

  // Add Quick Button and Menu Listeners
  quickRollButton.on('click', async function (event) {
    event.preventDefault()
    event.stopPropagation()

    const clickedMenuId = $(this).data('combatant-id')
    $(`.${buttonClass}`).each(function () {
      const menuId = $(this).data('combatant-id')
      if (!!menuId && clickedMenuId !== menuId) {
        $(this).parents().siblings('.quick-roll-menu').hide()
      }
    })

    const menu = $(this).parents().siblings('.quick-roll-menu')
    menu.toggle()

    // Let the #combat-popout has the correct height based on opened menu
    if (menu.is(':visible')) {
      // Set menu top position to quick roll button position + offset
      const menuOffset = $(this).position().top + 40
      menu.css('top', `${menuOffset}px`)

      // Find the selected <li> element
      const selectedLi = $(this).closest('[class*="combatant actor directory-item flexrow"]')
      const allLis = $('#combat-tracker [class*="combatant actor directory-item flexrow"]')
      const selectedIndex = allLis.index(selectedLi)

      // Count the number of <li> elements below the selected one
      const lisBelow = allLis.slice(selectedIndex + 1).length
      const popout = $('#combat-popout')
      const menuHeight = menu.outerHeight(true)
      const trackerHeight = popout.outerHeight(true)
      const additionalHeight = lisBelow * selectedLi.outerHeight(true)
      popout.css('min-height', `${menuHeight + trackerHeight - additionalHeight}px`)
    } else {
      $('#combat-popout').css('min-height', `unset`).css('height', `auto`)
    }
  })

  const combatantControlsDiv = $(html).find('.combatant-controls').first()
  combatantControlsDiv.prepend(quickRollButton)

  // Add Quick Roll Menu
  const actions = await TokenActions.fromToken(token)
  const { actor } = token
  const quickRollMenu = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/quick-roll-menu.hbs',
    {
      actor,
      combatant,
      blindRoll: actions.blindAsDefault,
      attributeChecks: actor.getChecks('attributeChecks'),
      otherChecks: actor.getChecks('otherChecks'),
      attackChecks: actor.getChecks('attackChecks'),
      defenseChecks: actor.getChecks('defenseChecks'),
      markedChecks: actor.getChecks('markedChecks'),
    }
  )
  const quickMenu = $(quickRollMenu)
  $(html).append(quickMenu)

  return html
}

export const addQuickRollListeners = () => {
  const updateText = event => {
    // find all buttons and make the change
    const buttons = $(document).find('.quick-roll-button.sm.atk')
    buttons.each(function () {
      const attackValue = $(this).find('.qr-attack-value')
      if (event.ctrlKey) {
        attackValue.text($(this).data('damage'))
      } else {
        attackValue.text($(this).data('skill'))
      }
    })
  }

  // Resolve Roll Type Toggle
  $(document)
    .off('click', '.quick-roll-blind-toggle')
    .on('click', '.quick-roll-blind-toggle', async function (event) {
      event.preventDefault()
      event.stopPropagation()
      const combatantId = $(this).data('combatant-id')
      const combatant = game.combat.combatants.get(combatantId)
      const token = canvas.tokens.get(combatant.token.id)
      const actions = await TokenActions.fromToken(token)
      actions.blindAsDefault = !actions.blindAsDefault
      await actions.save()
      $(this)
        .find('.qr-blind')
        .each(function () {
          $(this).toggleClass('active')
        })
    })

  // Resolve Ctrl Key when hovering Quick Roll menu
  $(document)
    .off('mouseover', '.quick-roll-menu')
    .on('mouseover', '.quick-roll-menu', function (event) {
      $(document).on('keydown', updateText)
      $(document).on('keyup', updateText)

      updateText(event)
    })
  $(document)
    .off('mouseout', '.quick-roll-menu')
    .on('mouseout', '.quick-roll-menu', function (event) {
      const button = $(this)
      const attackValue = button.find('.qr-attack-value')
      attackValue.text(button.data('skill'))

      $(document).off('keydown', updateText)
      $(document).off('keyup', updateText)
    })

  // Resolve Quick Roll Menu Button Click
  $(document)
    .off('click', '.quick-roll-button')
    .on('click', '.quick-roll-button', async function (event) {
      event.preventDefault()
      event.stopPropagation()

      const button = $(this)
      const combatantId = button.data('combatant-id')
      const combatant = game.combat.combatants.get(combatantId)
      const token = canvas.tokens.get(combatant.token.id)
      const actions = await TokenActions.fromToken(token)
      const actor = token.actor

      const otf = button.data('otf')
      const damage = button.data('otf-damage')
      const formula = event.ctrlKey && damage ? damage : otf

      await actor.runOTF(`${actions.blindAsDefault ? '!' : ''}${formula}`)
    })
}
