import { TokenActions } from '../token-actions.js'

export class GurpsCombat<SubType extends Combat.SubType = Combat.SubType> extends Combat<SubType> {
  // Remove maneuvers for all combatants on combat deletion
  protected override async _preDelete(
    options: Combat.Database.PreDeleteOptions,
    user: User.Stored
  ): Promise<boolean | void> {
    await super._preDelete(options, user)
    if (user.id === game.user?.id) {
      for (const combatant of this.combatants) {
        const tokenId = combatant.token?.id ?? null
        if (tokenId === null) continue
        const token = canvas?.tokens?.get(tokenId)
        if (token) {
          await token.removeManeuver()
        }
      }
    }
  }
}

export async function resetTokenActions(combat: Combat.Implementation) {
  for (const combatant of combat.combatants) {
    await resetTokenActionsForCombatant(combatant)
  }
}

const resetTokenActionsForCombatant = async (combatant: Combatant): Promise<void> => {
  if (!canvas || !canvas.tokens) return
  if (!combatant.token?.id) return

  const token = canvas?.tokens?.get(combatant.token?.id)
  const actions = await TokenActions.fromToken(token)
  await actions.clear()
}

interface FoundryCombatHistoryData {
  combatantId: string | null
  round: number
  turn: number | null
  tokenId: string | null
}

export async function handleCombatTurnChange(
  _combat: Combat.Implementation,
  _previousTurn: FoundryCombatHistoryData,
  newTurn: FoundryCombatHistoryData
) {
  if (!game.user?.isGM) return
  if (!canvas || !canvas.tokens) return
  if (newTurn.tokenId === null) return

  const token = canvas.tokens.get(newTurn.tokenId)
  if (!token) {
    console.warn(`Combat turn changed: ${newTurn.round}/${newTurn.turn} - token not found: ${newTurn.tokenId}`)
    return
  }

  console.info(`Combat turn changed: ${newTurn.round}/${newTurn.turn} - combatant: ${token.name}`)

  const actions = await TokenActions.fromToken(token)
  await actions.newTurn(newTurn.round)
}
