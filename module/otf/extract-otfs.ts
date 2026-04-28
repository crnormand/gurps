import { gurpslink } from 'module/utilities/gurpslink.js'
import { ParserResult } from './types.js'
import { atou, utoa } from 'lib/utilities.js'

export function extractOtfs(args: string[]) {
  const texts = args.slice(0, -1).filter(text => text)
  const combined = texts.join(' ')
  if (!combined) return []

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
  const results = gurpslink(combined, false, true) as ParserResult[] | string

  if (typeof results === 'string') return []

  return results
    .filter((result): result is ParserResult => result.action && rollableTypes.includes(result.action.type!))
    .map(result => {
      let actionData = result.action
      const dataActionMatch = result.text.match(/data-action='([^']+)'/)
      if (dataActionMatch) {
        actionData = JSON.parse(atou(dataActionMatch[1]))
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
        encodedAction: utoa(JSON.stringify(actionData)),
      }
    })
}
