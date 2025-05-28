import { MaybePromise } from 'fvtt-types/utils'

class GurpsTokenHUD extends TokenHUD {
  override getData(options?: Partial<Application.Options>): MaybePromise<object> {
    const data = super.getData(options)

    // @ts-expect-error: waiting for types to catch up
    const activeEffects = this.object.actor?.effects.contents ?? []

    // @ts-expect-error: Waiting for DataModel migration for actor
    const currentManeuverId = this.object.actor?.system.conditions.maneuver
    const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png'

    return foundry.utils.mergeObject(data, {
      icons: { maneuvers: maneuverIcon },
      // TODO: revise any to specific type
      maneuvers: Object.entries(GURPS.Maneuvers.getAll()).map(([id, maneuver]: [string, any]) => {
        return {
          cssClass: activeEffects.some(effect => effect.icon === maneuver._data.icon) ? 'active' : '',
          src: maneuver._data.icon,
          title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
          id,
        }
      }),
    })
  }
}

export { GurpsTokenHUD }
