import { addManeuverMenu } from './maneuver-menu.js'
import { addQuickRollButton, addQuickRollListeners } from './quick-roll-menu.js'
import { DragDropType } from '../drag-drop-types.js'

export async function renderCombatTracker(_app: any, element: HTMLElement, _options: any, _context: any) {
  if (!element.classList.contains('bound')) {
    element.classList.add('bound')

    element.addEventListener('drop', function (ev) {
      ev.preventDefault()
      ev.stopPropagation()

      if (!ev.dataTransfer) return
      if (!game.combat) return

      let elementMouseIsOver = document.elementFromPoint(ev.clientX, ev.clientY)
      if (!elementMouseIsOver) return

      let combatantElement = elementMouseIsOver.closest('.combatant') as HTMLElement | null
      let combatantId = combatantElement?.dataset.combatantId
      if (!combatantId) return

      let target = game.combat.combatants.get(combatantId)

      const rawData = ev.dataTransfer.getData('text/plain')
      if (!rawData) return

      let dropData: any
      try {
        dropData = JSON.parse(rawData)
      } catch (error) {
        console.warn('Invalid drop data received in combat tracker:', rawData, error)
        return
      }

      if (!dropData || typeof dropData !== 'object') {
        console.warn('Unexpected drop data format in combat tracker:', dropData)
        return
      }

      if (dropData.type === DragDropType.DAMAGE) {
        if (target?.actor) target.actor.handleDamageDrop(dropData.payload)
      }

      if (dropData.type === DragDropType.INITIATIVE) {
        let src = game.combat.combatants.get(dropData.combatant)
        let updates: any[] = []

        // The problem with this approach is that if you drag two or more combatants to the same position, they will
        // end up with the same initiative value and their order relative to each other is nondeterministic. A more
        // robust solution would require recalculating initiatives for all combatants between the source and target
        // positions, which is more complex.
        //
        // Also: GitHub Copilot suggested that we allow for reordering even when initiative values are missing, by treating
        // missing initiatives as zero. This effectively sets initiative on actors that had none before, which may be
        // unexpected behavior (such as not being able to roll initiative again to set it afresh).
        if (target?.initiative && src?.initiative && target.id !== src.id) {
          if (target.initiative < src.initiative) {
            updates.push({
              _id: dropData.combatant,
              initiative: target.initiative - 0.00001,
            })
            console.log('Moving ' + src.name + ' below ' + target.name)
          } else {
            updates.push({
              _id: dropData.combatant,
              initiative: target.initiative + 0.00001,
            })
            console.log('Moving ' + src.name + ' above ' + target.name)
          }
          game.combat.updateEmbeddedDocuments('Combatant', updates)
        }
      }
    })
  }

  if (!game.user) return
  if (game.user.isGM) {
    const combatantElements = element.querySelectorAll<HTMLElement>('.combatant')
    combatantElements.forEach(li => {
      li.setAttribute('draggable', 'true')
      li.addEventListener('dragstart', ev => {
        if (!ev.currentTarget) return

        // If the combatant doesn't have an initiative, don't allow dragging for reordering.
        const li = ev.currentTarget as HTMLElement
        const combatantId = li.dataset.combatantId
        if (!combatantId) return
        const combatant = game.combat?.combatants.get(combatantId)
        if (!combatant || combatant.initiative === null) return

        const currentTarget = ev.currentTarget as HTMLElement
        let display = currentTarget.innerText ?? 'combatant'
        let dragIcon = currentTarget.querySelector<HTMLElement>('.token-image')

        if (dragIcon) ev.dataTransfer!.setDragImage(dragIcon, 25, 25)
        return ev.dataTransfer!.setData(
          'text/plain',
          JSON.stringify({
            type: DragDropType.INITIATIVE,
            displayname: display,
            combatant: li.dataset.combatantId,
          })
        )
      })
    })
  }

  // Resolve Quick Roll and Maneuver buttons
  const combatants = element.querySelectorAll<HTMLElement>('.combatant')
  for (let combatantElement of combatants) {
    const combatantId = combatantElement.dataset?.combatantId
    if (!combatantId) {
      console.warn('Combatant id not found for element', combatantElement)
      continue
    }

    if (!game.combat) {
      console.warn('No active combat found when resolving combat tracker buttons')
      continue
    }

    const combatant = game.combat.combatants.get(combatantId)
    if (!combatant) {
      console.warn(`Combatant not found for id: ${combatantId}`)
      continue
    }

    const token = canvas?.tokens?.get(combatant.token?.id ?? '')
    if (!token) {
      console.warn(`Token not found for combatant: ${combatant.name ?? 'unknown'}`)
      continue
    }

    // Add Quick Roll Menu
    await addQuickRollButton(combatantElement, combatant, token)

    // Add Maneuver Menu
    await addManeuverMenu(combatantElement, combatant, token)
  }
  // Add Quick Roll Listeners.
  addQuickRollListeners()
}
