import Maneuvers from '../actor/maneuver.js'
import { isCombatActive, isTokenInActiveCombat } from '../game-utils.js'
import { DatabaseCreateOperation } from 'node_modules/fvtt-types/src/foundry/common/abstract/_types.mjs'
import { TokenActions } from '../token-actions.js'

// COMPATIBILITY: v12
// export default class TokenGURPS extends foundry.canvas.placeables.Token {
class TokenGURPS extends Token {
  /* ---------------------------------------- */

  protected override _onCreate(
    data: foundry.data.fields.SchemaField.CreateData<Token.Schema>,
    options: foundry.abstract.Document.Database.CreateOptions<DatabaseCreateOperation>,
    userId: string
  ): void {
    super._onCreate(data, options, userId)
    const actor = this.actor
    if (actor) {
      // @ts-expect-error: Waiting for DataModel migration for Actor
      const maneuverText = actor.system.conditions.maneuver
      actor.replaceManeuver(maneuverText)
    }
  }

  /* ---------------------------------------- */

  protected override async _drawEffects(): Promise<void> {
    console.log('TokenGURPS._drawEffects')
    return super._drawEffects()
  }

  /* ---------------------------------------- */

  /**
   * We use this function because maneuvers are special Active Effects: maneuvers don't apply
   * outside of combat, and only one maneuver can be active simultaneously. So we really don't
   * deactivate the old maneuver and then activate the new one -- we simply update the singleton
   * maneuver data to match the new maneuver's data.
   */
  async setManeuver(maneuverId: string): Promise<void> {
    // if not in combat, do nothing
    if (!isCombatActive || !isTokenInActiveCombat(this)) return

    console.log('TokenGURPS.setManeuver', maneuverId)

    const maneuver = Maneuvers.get(maneuverId)
    if (!maneuver) return

    const activeManeuvers = Maneuvers.getActiveEffectManeuvers(Array.from(this.actor?.effects.values() ?? []))
    // if there is a single active effect maneuver, update its data
    if (activeManeuvers.length === 1) {
      // @ts-expect-error: waiting for flag type update
      if (activeManeuvers[0].getFlag('gurps', 'name') !== maneuverId) activeManeuvers[0].update(maneuver)
    } else {
      if (activeManeuvers.length > 1) {
        await this.actor?.deleteEmbeddedDocuments(
          'ActiveEffect',
          activeManeuvers.map(m => m.id!)
        )
      }
      maneuver.name = game.i18n?.localize(maneuver.name ?? maneuver.label) ?? maneuver.name
      maneuver.statuses = Array.from(new Set([maneuver.id, ...(maneuver.statuses ?? [])]))
      await this.actor?.createEmbeddedDocuments('ActiveEffect', [maneuver])
    }

    const actions = await TokenActions.fromToken(this)
    await actions.selectManeuver(maneuver, game.combat?.round)
  }

  /* ---------------------------------------- */

  /**
   * Assumes that this token is not in combat any more -- if so, updating the manuever will only
   * update the actor's data model, and not add/update the active effect that represents that
   * Maneuver.
   */
  async removeManeuver(): Promise<void> {
    let maneuvers = Maneuvers.getActiveEffectManeuvers(Array.from(this.actor?.effects.values() ?? []))
    this.actor?.deleteEmbeddedDocuments(
      'ActiveEffect',
      maneuvers.map(m => m.id!)
    )
  }
}
export { TokenGURPS }
