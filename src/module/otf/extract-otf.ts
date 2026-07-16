import { gurpslink } from '../../util/gurpslink.js'

import { OtfActionType } from './types.js'

const rollableTypes = [
  OtfActionType.attribute,
  OtfActionType.skillSpell,
  OtfActionType.attack,
  OtfActionType.attackDamage,
  OtfActionType.weaponParry,
  OtfActionType.weaponBlock,
  OtfActionType.controlRoll,
  OtfActionType.roll,
  OtfActionType.damage,
  OtfActionType.derivedRoll,
  OtfActionType.derivedDamage,
  OtfActionType.chat,
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
        actionData.type === OtfActionType.skillSpell ||
        actionData.type === OtfActionType.attack ||
        actionData.type === OtfActionType.attackDamage ||
        actionData.type === OtfActionType.weaponParry ||
        actionData.type === OtfActionType.weaponBlock
      ) {
        displayText = actionData.name || ''
      } else if (actionData.type === OtfActionType.attribute) {
        displayText = actionData.attribute || ''
      } else if (actionData.type === OtfActionType.controlRoll) {
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
        encodedAction: btoa(JSON.stringify(actionData)),
      }
    })
}
