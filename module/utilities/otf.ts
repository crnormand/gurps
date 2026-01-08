import { gurpslink } from './gurpslink.js'

const rollableTypes = [
  'attribute',
  'skill-spell',
  'attack',
  'attackdamage',
  'weapon-parry',
  'weapon-block',
  'controlroll',
  'roll',
  'damage',
  'derivedroll',
  'deriveddamage',
  'chat',
]

/* ---------------------------------------- */

export function extractOtfs(text: string) {
  if (!text) return []
  const actions = gurpslink(text, true) as any[]

  return actions
    .filter(action => action.action && rollableTypes.includes(action.action.type))
    .map(action => {
      let actionData = action.action
      const dataActionMatch = action.text.match(/data-action='([^']+)'/)
      if (dataActionMatch) {
        actionData = JSON.parse(atob(dataActionMatch[1]))
      }

      let displayText = ''

      if (actionData.overridetxt) {
        displayText = actionData.overridetxt
      } else if (
        actionData.type === 'skill-spell' ||
        actionData.type === 'attack' ||
        actionData.type === 'attackdamage' ||
        actionData.type === 'weapon-parry' ||
        actionData.type === 'weapon-block'
      ) {
        displayText = actionData.name || ''
      } else if (actionData.type === 'attribute') {
        displayText = actionData.attribute || ''
      } else if (actionData.type === 'controlroll') {
        displayText = actionData.desc || ''
      } else if (actionData.type === 'chat') {
        displayText = 'Action'
      }

      let fullFormula = actionData.orig
      if (actionData.overridetxt) {
        fullFormula = `"${actionData.overridetxt}" ${actionData.orig}`
      }

      return {
        formula: fullFormula,
        text: displayText,
        encodedAction: btoa(JSON.stringify(actionData)),
      }
    })
}
