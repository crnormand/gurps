import { DeepPartial } from 'fvtt-types/utils'

export class GurpsTokenHUDV2<
  RenderContext extends foundry.applications.hud.BasePlaceableHUD.RenderContext = foundry.applications.hud.BasePlaceableHUD.RenderContext,
  Configuration extends foundry.applications.hud.BasePlaceableHUD.Configuration = foundry.applications.hud.BasePlaceableHUD.Configuration,
  RenderOptions extends foundry.applications.hud.BasePlaceableHUD.RenderOptions = foundry.applications.hud.BasePlaceableHUD.RenderOptions,
> extends foundry.applications.hud.TokenHUD<RenderContext, Configuration, RenderOptions> {
  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    actions: {
      maneuver: GurpsTokenHUDV2.#onSetManeuver,
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
    options: DeepPartial<RenderOptions> & { isFirstRender: boolean }
  ): Promise<RenderContext> {
    const context = await super._prepareContext(options)

    const activeEffects = this.object.actor?.effects.contents ?? []

    // @ts-expect-error: Waiting for DataModel migration for actor
    const currentManeuverId = this.object.actor?.system.conditions.maneuver
    const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png'

    Object.assign(context, {
      icons: { maneuvers: maneuverIcon },
      // TODO: revise any to specific type
      maneuvers: Object.entries(GURPS.Maneuvers.getAll()).map(([id, maneuver]: [string, any]) => {
        return {
          cssClass: activeEffects.some(effect =>
            effect.changes.some(
              change => change.key === 'system.conditions.maneuver' && change.value === maneuver._data.name
            )
          )
            ? 'active'
            : '',
          src: maneuver._data.icon,
          title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
          id,
        }
      }),
    })
    return context
  }

  /* ---------------------------------------- */

  static async #onSetManeuver(this: GurpsTokenHUDV2, _event: PointerEvent, target: HTMLElement): Promise<void> {
    // @ts-expect-error: waiting for types to catch up
    if (!this.actor) {
      ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true })
      return
    }

    const maneuverId = target.dataset.statusId || 'do_nothing'
    this.object.setManeuver(maneuverId)
  }
}
