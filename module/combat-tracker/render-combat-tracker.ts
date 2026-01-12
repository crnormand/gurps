import { addManeuverMenu } from './maneuver-menu.js'
import { addQuickRollButton, addQuickRollListeners } from './quick-roll-menu.js'

export async function renderCombatTracker(_app: any, element: HTMLElement, _options: any, _context: any) {
  const html = $(element)
  if (!html.hasClass('bound')) {
    html.addClass('bound')

    html.on('drop', function (ev) {
      ev.preventDefault()
      ev.stopPropagation()

      let event = ev.originalEvent
      if (!event?.dataTransfer) return

      let elementMouseIsOver = document.elementFromPoint(ev.clientX!, ev.clientY!)
      if (!elementMouseIsOver) return

      if (!game.combat) return

      let combatant = $(elementMouseIsOver).parents('.combatant').attr('data-combatant-id')
      let target = game.combat.combatants.filter(c => c.id === combatant)[0]

      let dropData = JSON.parse(event.dataTransfer!.getData('text/plain'))
      if (dropData.type === 'damageItem') {
        if (target.actor) target.actor.handleDamageDrop(dropData.payload)
      }

      if (dropData.type === 'initiative') {
        if (!combatant) return

        let target = game.combat.combatants.get(combatant)
        let src = game.combat.combatants.get(dropData.combatant)
        let updates = []

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
    html.find('.combatant').each((_, li) => {
      li.setAttribute('draggable', 'true')
      li.addEventListener('dragstart', ev => {
        if (!ev.currentTarget) return
        let display = (ev.currentTarget as HTMLElement).innerText ?? 'combatant'
        let dragIcon = $(ev.currentTarget).find('.token-image')[0]

        if (dragIcon) ev.dataTransfer!.setDragImage(dragIcon, 25, 25)
        return ev.dataTransfer!.setData(
          'text/plain',
          JSON.stringify({
            type: 'initiative',
            displayname: display,
            combatant: li.getAttribute('data-combatant-id'),
          })
        )
      })
    })
  }

  // Resolve Quick Roll and Maneuver buttons
  const combatants = html.find('.combatant')
  for (let combatantElement of combatants) {
    const combatant = await game.combat!.combatants.get(combatantElement.dataset!.combatantId!)!
    const token = canvas!.tokens!.get(combatant.token?.id ?? '')
    if (!token) {
      console.warn(`Token not found for combatant: ${combatant.name ?? 'unknown'}`)
      continue
    }

    // Add Quick Roll Menu
    combatantElement = await addQuickRollButton(combatantElement, combatant, token)

    // Add Maneuver Menu
    combatantElement = await addManeuverMenu(combatantElement, combatant, token)
  }
  // Add Quick Roll Listeners.
  addQuickRollListeners()
}
