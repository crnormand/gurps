class CombatGURPS extends Combat {
  // Remove maneuvers for all combatants on combat deletion
  protected override async _preDelete(
    options: Combat.Database.PreDeleteOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
    await super._preDelete(options, user)
    if (user.id === game.user?.id) {
      this.combatants.forEach(async combatant => {
        const tokenId = combatant.token?.id ?? null
        if (tokenId === null) return
        const token = canvas.tokens?.get(tokenId)
        if (token) {
          token.removeManeuver()
        }
      })
    }
  }
}

export { CombatGURPS }
