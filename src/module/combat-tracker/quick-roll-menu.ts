import { GurpsToken } from '@module/token/gurps-token.js'
import * as Settings from '@module/util/miscellaneous-settings.js'

export const addQuickRollButton = async (html: HTMLElement, combatant: Combatant, token: GurpsToken) => {
  const quickRollSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS)
  const canShowButtons = quickRollSettings?.enabled && (game.user?.isGM || combatant.isOwner)

  if (!canShowButtons || !token?.actor) return html

  const buttonClass = `combatant-control`
  const quickRollButton = foundry.utils.parseHTML(
    `<a class="${buttonClass}"
          aria-label="Quick Roll"
          role="button"
          data-control="quickRollMenu"
          data-combatant-id="${combatant.id}"
          data-tooltip="GURPS.quickRollMenu"
          id="quick-roll-${combatant.id}">
          <i class="fa-solid fa-dice-five"></i>
    </a>`
  ) as HTMLElement

  // Add Quick Button and Menu Listeners
  quickRollButton.addEventListener('click', async function (event) {
    event.preventDefault()
    event.stopPropagation()

    const clickedMenuId = this.dataset.combatantId

    document.querySelectorAll(`.${buttonClass}`).forEach(function (element) {
      const menuId = (element as HTMLElement).dataset.combatantId

      if (!!menuId && clickedMenuId !== menuId) {
        const otherMenu = (element as HTMLElement).closest('li')?.querySelector('.quick-roll-menu')

        if (otherMenu) (otherMenu as HTMLElement).style.display = 'none'
      }
    })

    const menu = this.closest('li')?.querySelector('.quick-roll-menu') as HTMLElement | null

    if (!menu) {
      console.warn(`Quick Roll Menu not found for combatant: ${combatant.name ?? 'unknown'}`)

      return
    }

    menu.style.display = menu.style.display === 'none' ? 'block' : 'none'

    if (menu.style.display !== 'none') {
      // Set menu top position to quick roll button position + offset
      const menuOffset = this.offsetTop + this.offsetHeight

      menu.style.top = `${menuOffset}px`
    }

    const popOut = this.closest('#combat-popout') as HTMLElement | null

    if (popOut) {
      // Let the #combat-popout has the correct height based on opened menu
      if (menu.style.display !== 'none') {
        // Find the selected <li> element
        const selectedLi = this.closest('li.combatant')

        if (!selectedLi) {
          console.warn(`Selected <li> element not found for combatant: ${combatant.name ?? 'unknown'}`)

          return
        }

        const allLis = popOut.querySelectorAll('li.combatant')
        const selectedIndex = Array.from(allLis).indexOf(selectedLi)

        // Count the number of <li> elements below the selected one
        const lisBelow = allLis.length - selectedIndex - 1
        const menuHeight = menu.offsetHeight ?? 0
        const trackerHeight = popOut.offsetHeight ?? 0
        const additionalHeight =
          lisBelow *
          ((selectedLi as HTMLElement)?.offsetHeight +
            (parseInt(getComputedStyle(selectedLi as HTMLElement).marginBottom) || 0))

        popOut.style.minHeight = `${menuHeight + trackerHeight - additionalHeight}px`
      } else {
        popOut.style.minHeight = `unset`
        popOut.style.height = `auto`
      }
    }
  })

  const combatantControlsDiv = html.querySelector('.combatant-controls')

  combatantControlsDiv?.prepend(quickRollButton)

  // Add Quick Roll Menu
  const { actor } = token
  const quickRollMenu = await foundry.applications.handlebars.renderTemplate(
    'systems/gurps/templates/quick-roll-menu.hbs',
    {
      actor,
      combatant,
      attributeChecks: actor.getChecks('attributeChecks'),
      otherChecks: actor.getChecks('otherChecks'),
      attackChecks: actor.getChecks('attackChecks'),
      defenseChecks: actor.getChecks('defenseChecks'),
      markedChecks: actor.getChecks('markedChecks'),
    }
  )

  const quickRollMenuElement = foundry.utils.parseHTML(quickRollMenu) as HTMLElement

  quickRollMenuElement.style.display = 'none'

  addQuickRollListeners(quickRollMenuElement)

  html.append(quickRollMenuElement)

  return html
}

export const addQuickRollListeners = (html: HTMLElement) => {
  // Resolve Quick Roll Menu Button Click
  html.querySelectorAll('.quick-roll-button').forEach(item => {
    ;(item as HTMLElement).addEventListener('click', async function (event: PointerEvent) {
      event.preventDefault()
      event.stopPropagation()

      const button = event.currentTarget as HTMLElement
      const combatantId = button.dataset.combatantId
      const combatant = game.combat?.combatants.get(combatantId ?? '')

      if (!combatant || !combatant.token?.id) {
        console.warn(`Combatant not found for id: ${combatantId}`)

        return
      }

      const token = canvas?.tokens?.get(combatant.token.id)

      if (!token || !token.actor) {
        console.warn(`Token or actor not found for combatant: ${combatant.name ?? 'unknown'}`)

        return
      }

      const actor = token.actor

      const otf = button.dataset.otf
      const damage = button.dataset.otfDamage
      const formula = event.ctrlKey && damage ? damage : otf

      await actor.runOTF(formula ?? '')
    })
  })
}
