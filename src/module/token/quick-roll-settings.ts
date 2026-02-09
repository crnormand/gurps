import * as Settings from '@module/util/miscellaneous-settings.js'
import { DeepPartial } from 'fvtt-types/utils'

class QuickRollSettings extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    tag: 'form',
    id: 'quick-roll-settings',
    window: {
      title: game.i18n?.localize('GURPS.settingUseQuickRolls') ?? '',
    },
    position: {
      width: 400,
    },
    form: {
      handler: QuickRollSettings.#onSubmit,
      closeOnSubmit: true,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: 'systems/gurps/templates/quick-roll-settings.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<foundry.applications.api.ApplicationV2.RenderContext> {
    const context = await super._prepareContext(options)

    return foundry.utils.mergeObject(context, {
      settings: game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS),
    })
  }

  /* ---------------------------------------- */

  static async #onSubmit(
    this: QuickRollSettings,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    await game.settings?.set(GURPS.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS, formData.object)
  }
}

export { QuickRollSettings }
