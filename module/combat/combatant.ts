import { TokenActions } from '../token-actions.js'

class GurpsCombatant<SubType extends Combatant.SubType = Combatant.SubType> extends Combatant<SubType> {
  // Set "Do Nothing" maneuver by defualt when a combatant is created (enters combat)
  protected override _onCreate(
    data: Combatant.CreateData,
    options: Combatant.Database.OnCreateOperation,
    userId: string
  ): void {
    super._onCreate(data, options, userId)

    if (userId === game.user?.id) {
      const tokenId = this.token?.id ?? null

      if (tokenId === null) return
      const token = canvas?.tokens?.get(tokenId)

      if (token) token.setManeuver('do_nothing')
    }
  }

  /* ---------------------------------------- */

  // Reset token actions and remove maneuver
  protected override async _preDelete(
    options: Combatant.Database.PreDeleteOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
    await super._preDelete(options, user)

    if (user.id === game.user?.id) {
      const tokenId = this.token?.id ?? null

      if (tokenId === null) return

      const token = canvas?.tokens?.get(tokenId)

      if (token) {
        // Reset token actions
        const actions = await TokenActions.fromToken(token)

        await actions.clear()

        // Reset token maneuver
        token.removeManeuver()
      }
    }
  }
}

export { GurpsCombatant }
