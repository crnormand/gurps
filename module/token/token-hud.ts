import { DeepPartial } from 'fvtt-types/utils'

class GurpsTokenHUD extends foundry.applications.hud.TokenHUD {
  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    actions: {
      maneuver: GurpsTokenHUD.#onSetManeuver,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    hud: {
      root: true,
      template: 'systems/gurps/templates/hud/token-hud.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<foundry.applications.hud.BasePlaceableHUD.RenderContext> {
    const context = await super._prepareContext(options)

    const activeEffects = this.object.actor?.effects.contents ?? []

    // @ts-expect-error: Waiting for DataModel migration for actor
    const currentManeuverId = this.object.actor?.system.conditions.maneuver
    const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png'

    return foundry.utils.mergeObject(context, {
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

  /* ---------------------------------------- */

  static async #onSetManeuver(this: GurpsTokenHUD, _event: PointerEvent, target: HTMLElement): Promise<void> {
    // @ts-expect-error: waiting for types to catch up
    if (!this.actor) {
      ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true })
      return
    }

    const maneuverId = target.dataset.statusId || 'do_nothing'
    this.object.setManeuver(maneuverId)
  }
}

/* ---------------------------------------- */
export { GurpsTokenHUD }
