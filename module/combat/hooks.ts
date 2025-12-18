import * as Settings from '../../lib/miscellaneous-settings.js'

export function onTargetToken(user: User.Implementation, token: Token.Implementation, targeted: boolean) {
  if (!game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE)) return

  // Also return immediately if there is no controlled token.
  const controlled = canvas!.tokens?.controlled || []
  if (controlled.length === 0) return

  if (!targeted) {
    token.actor?.removeTargetModifiers(['#melee'], ['@size'])
    return
  }

  // For each controlled token, add a modifier to the target modifiers based on size difference.
  for (const ctrlToken of controlled) {
    const attackerSM = (ctrlToken.actor!.system as any).traits.sizemod
    const defenderSM = (token.actor!.system as any).traits.sizemod

    if (!attackerSM || !defenderSM) continue

    const sizeDiff = parseInt(attackerSM) - parseInt(defenderSM)
    if (sizeDiff === 0) continue

    const sizeModStr = sizeDiff > 0 ? `+${sizeDiff}` : `${sizeDiff}`

    token.actor?.addTargetModifier({
      modifier: game.i18n!.format('GURPS.modifiersSizeDifference', { sm: sizeModStr }),
      tags: ['#melee'],
      sources: ['@combatmod', '@sizemod'],
    } as any)
  }
}
