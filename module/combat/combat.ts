class GurpsCombat<SubType extends Combat.SubType = Combat.SubType> extends Combat<SubType> {
  // Remove maneuvers for all combatants on combat deletion
  protected override async _preDelete(
    options: Combat.Database.PreDeleteOptions,
    user: User.Implementation
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

export { GurpsCombat }
