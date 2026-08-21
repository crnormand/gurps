import { DeepPartial } from 'fvtt-types/utils'

export class GurpsTokenHUDV2<
  RenderContext extends
    foundry.applications.hud.TokenHUD.RenderContext = foundry.applications.hud.TokenHUD.RenderContext,
  Configuration extends
    foundry.applications.hud.TokenHUD.Configuration = foundry.applications.hud.TokenHUD.Configuration,
  RenderOptions extends
    foundry.applications.hud.TokenHUD.RenderOptions = foundry.applications.hud.TokenHUD.RenderOptions,
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

    const activeEffects = this.object?.actor?.effects.contents ?? []

    // @ts-expect-error: Waiting for DataModel migration for actor
    const currentManeuverId = this.object.actor?.system.conditions.maneuver
    const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png'

    Object.assign(context, {
      icons: { maneuvers: maneuverIcon, ...context.icons },

      maneuvers: Object.entries(GURPS.Maneuvers.getAll()).map(([id, maneuver]: [string, any]) => {
        return {
          cssClass: activeEffects.some(effect =>
            effect.changes.some(
              change => change.key === 'system.conditions.maneuver' && change.value === maneuver._data.name
            )
          )
            ? 'active'
            : '',
          src: maneuver._data.img,
          title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
          id,
        }
      }),
    })
    return context
  }

  /* ---------------------------------------- */

  static async #onSetManeuver(this: GurpsTokenHUDV2, _event: PointerEvent, target: HTMLElement): Promise<void> {
    if (!this.actor) {
      ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true })
      return
    }

    const maneuverId = target.dataset.statusId || 'do_nothing'
    this.object?.setManeuver(maneuverId)
  }
}
