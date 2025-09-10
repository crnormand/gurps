import { DeepPartial } from 'fvtt-types/utils'
import ActiveEffectConfig = foundry.applications.sheets.ActiveEffectConfig

export class GurpsActiveEffectConfig extends ActiveEffectConfig {
  _parentWindow: foundry.applications.api.DocumentSheet.Any | null = null

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<ActiveEffectConfig.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActiveEffectConfig.RenderContext> {
    const context = await super._prepareContext(options)

    for (let i = 0; i < context.source.changes.length; i++) {
      context.source.changes[i].value =
        game.i18n?.localize(context.source.changes[i].value) ?? context.source.changes[i].value
    }

    return context
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    context: DeepPartial<ActiveEffectConfig.RenderContext>,
    options: DeepPartial<ActiveEffectConfig.RenderOptions> & {
      parentWindow?: foundry.applications.api.DocumentSheet.Any
    }
  ): Promise<void> {
    // If this is the first render, we need to set the parent window so that we can refresh it later.
    if (options.isFirstRender && !this._parentWindow) {
      this._parentWindow = options.parentWindow || null
    }
    // Call the super method to ensure the rendering happens.
    return super._onRender(context, options)
  }

  /* ---------------------------------------- */

  protected override _onClose(options: DeepPartial<ActiveEffectConfig.RenderOptions>): void {
    super._onClose(options)
    this._parentWindow?.render({ force: true })
  }
}
