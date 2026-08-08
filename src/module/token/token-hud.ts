import { ActorType } from '@module/actor/types.js'
import { DeepPartial } from 'fvtt-types/utils'

namespace GurpsTokenHUDV2 {
  interface ManeuverRenderData {
    cssClass: string
    id: string
    src: string
    title: string
  }

  export interface RenderContext extends foundry.applications.hud.TokenHUD.RenderContext {
    icons: { maneuvers: string }
    maneuvers: ManeuverRenderData[]
  }
}

/* ---------------------------------------- */

class GurpsTokenHUDV2<
  RenderContext extends foundry.applications.hud.TokenHUD.RenderContext = GurpsTokenHUDV2.RenderContext,
  Configuration extends
    foundry.applications.hud.TokenHUD.Configuration = foundry.applications.hud.TokenHUD.Configuration,
  RenderOptions extends
    foundry.applications.hud.TokenHUD.RenderOptions = foundry.applications.hud.TokenHUD.RenderOptions,
> extends foundry.applications.hud.TokenHUD<RenderContext, Configuration, RenderOptions> {
  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.hud.TokenHUD.Configuration> = {
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

    const actor = this.object.actor

    if (!actor) {
      console.error('TokenHUD has no assigned Actor!')

      return context
    }

    if (!actor.isOfType(ActorType.Character)) {
      console.warn('Actor is of unsupported type, cannot get current Maneuver!')

      return context
    }

    const activeEffects = actor.effects.contents ?? []

    const currentManeuverId = actor.system.conditions.maneuver

    const maneuverIcon = currentManeuverId
      ? (GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png')
      : 'systems/gurps/icons/maneuvers/man-nothing.png'

    const maneuvers = Object.keys(GURPS.Maneuvers.getAll()).flatMap(id => {
      const maneuver = GURPS.Maneuvers.get(id)

      return maneuver
        ? [
            {
              cssClass: activeEffects.some(effect =>
                effect.changes.some(change => change.key === 'system.conditions.maneuver' && change.value === id)
              )
                ? 'active'
                : '',
              src: maneuver.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png',
              title: game.i18n?.localize(maneuver.label) ?? maneuver.label,
              id,
            },
          ]
        : []
    })

    return Object.assign(context, {
      icons: { maneuvers: maneuverIcon },
      maneuvers,
    })
  }

  /* ---------------------------------------- */

  static async #onSetManeuver(this: GurpsTokenHUDV2, _event: PointerEvent, target: HTMLElement): Promise<void> {
    // @ts-expect-error: waiting for types to catch up
    if (!this.actor) {
      ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true })

      return
    }

    const maneuverId = target.dataset.statusId || 'do_nothing'

    await this.object.setManeuver(maneuverId)
  }
}

/* ---------------------------------------- */

export { GurpsTokenHUDV2 }
