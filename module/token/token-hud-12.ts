// @ts-nocheck: COMPATIBILITY: v12
import { MaybePromise } from 'fvtt-types/utils'

class GurpsTokenHUD extends TokenHUD {
  #maneuverTrayActive = false

  /* ---------------------------------------- */

  static override get defaultOptions(): Application.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/gurps/templates/hud/token-hud-12.hbs',
    })
  }

  /* ---------------------------------------- */

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
          cssClass: activeEffects.some(effect => effect.img === maneuver._data.icon) ? 'active' : '',
          src: maneuver._data.icon,
          title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
          id,
        }
      }),
    })
  }

  /* ---------------------------------------- */

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html)
    this.toggleManeuverTray(this.#maneuverTrayActive)
    const effectsTray = html.find('.maneuver-palette')
    effectsTray.on('click', '.maneuver-control', this.#onSetManeuver.bind(this))

    html.find('.control-icon[data-action="effects"]').on('click', () => this.toggleManeuverTray(false))
  }

  /* ---------------------------------------- */

  toggleManeuverTray(active: boolean) {
    active ??= !this.#maneuverTrayActive
    this.#maneuverTrayActive = active
    const button = this.element.find('.control-icon[data-action="maneuvers"]')[0]
    button?.classList.toggle('active', active)
    const palette = this.element[0].querySelector('.maneuver-palette')
    palette?.classList.toggle('active', active)
  }

  /* ---------------------------------------- */

  protected override _onClickControl(event: JQuery.ClickEvent): void {
    super._onClickControl(event)
    // @ts-expect-error: not sure why this is needed, but it is
    if (event.defaultPrevented) return
    const button = event.currentTarget
    switch (button.dataset.action) {
      case 'maneuvers':
        return this.#onToggleManeuvers(event)
    }
  }

  /* ---------------------------------------- */

  #onToggleManeuvers(event: JQuery.ClickEvent): void {
    event.preventDefault()

    // @ts-expect-error: types for this application are incorrect
    this.toggleStatusTray(false) // Close the status tray if it's open
    this.toggleManeuverTray(!this.#maneuverTrayActive)
  }

  async #onSetManeuver(event: JQuery.ClickEvent): Promise<void> {
    if (!this.object?.actor) {
      ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true })
      return
    }

    const maneuverId = event.target.dataset.statusId || 'do_nothing'
    await this.object.setManeuver(maneuverId)
    this.toggleManeuverTray(false)
  }
}

export { GurpsTokenHUD }
