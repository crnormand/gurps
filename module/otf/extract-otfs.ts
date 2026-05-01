import { gurpslink } from '../utilities/gurpslink.js'
import { OtfActionType, ParserResult } from './types.js'
import { atou, utoa } from '../../lib/utilities.js'

export function extractOtfs(texts: string[]) {
  const combined = texts.join(' ')
  if (!combined) return []

  const rollableTypes = [
    OtfActionType.attribute,
    OtfActionType.skillSpell,
    OtfActionType.attack,
    OtfActionType.attackdamage,
    OtfActionType.weaponParry,
    OtfActionType.weaponBlock,
    OtfActionType.controlroll,
    OtfActionType.roll,
    OtfActionType.damage,
    OtfActionType.derivedroll,
    OtfActionType.deriveddamage,
    OtfActionType.chat,
  ]
  const results = gurpslink(combined, false, true) as ParserResult[] | string

  if (typeof results === 'string') return []

  return (
    results
      // @ts-expect-error: rollableTypes is a subset of ActionType, but TypeScript doesn't understand that
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
          actionData.type === OtfActionType.skillSpell ||
          actionData.type === OtfActionType.attack ||
          actionData.type === OtfActionType.attackdamage ||
          actionData.type === OtfActionType.weaponParry ||
          actionData.type === OtfActionType.weaponBlock
        ) {
          displayText = actionData.name || ''
        } else if (actionData.type === OtfActionType.attribute) {
          displayText = actionData.attribute || ''
        } else if (actionData.type === OtfActionType.controlroll) {
          displayText = actionData.desc || ''
        } else if (actionData.type === OtfActionType.chat) {
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
  )
}
