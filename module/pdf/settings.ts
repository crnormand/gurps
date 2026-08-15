import { MODULE_NAME, SETTING_BASICSET_PDF, SETTING_PDF_OPEN_FIRST } from './types.js'

export function registerPDFSettings() {
  if (!game.settings) throw new Error('GURPS | PDF module requires game.settings to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, {
    name: 'GURPS.settingBasicPDFs',
    hint: 'GURPS.settingHintBasicPDFs',
    scope: 'world',
    config: false,
    type: String as any,
    // @ts-expect-error: choices may not be typed in Foundry's API
    choices: {
      Combined: 'GURPS.settingBasicPDFsCombined',
      Separate: 'GURPS.settingBasicPDFsSeparate',
      Revised: 'GURPS.settingBasicPDFsRevised',
    },
    default: 'Combined',
    onChange: value => console.log(`Basic Set PDFs : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST, {
    name: 'GURPS.settingPDFOpenFirst',
    hint: 'GURPS.settingHintPDFOpenFirst',
    scope: 'world',
    config: false,
    type: Boolean as any,
    default: false, // Migrate old setting if needed
    onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
  })

  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: 'GURPS.pdf.settingsName',
    hint: 'GURPS.pdf.settingsHint',
    label: 'GURPS.pdf.settingsButton',
    type: PDFSettingsApplication,
    restricted: false,
    icon: 'fa-solid fa-file-pdf',
  })
}

export function isOpenFirstPDFSetting(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST) ?? false
}

export function getBasicSetPDFSetting(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF) as string
}

class PDFSettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS = {
    tag: 'form',
    id: 'pdf-settings',
    window: {
      classes: ['standard-form'],
      title: game.i18n?.localize('GURPS.pdf.settingsButton') ?? '',
    },
    position: {
      width: 400,
    },
    form: {
      handler: PDFSettingsApplication.#onSubmit,
      closeOnSubmit: true,
    },
  }

  static override PARTS = {
    main: {
      template: 'systems/gurps/templates/pdf/settings.hbs',
    },
    footer: {
      template: 'templates/generic/form-footer.hbs',
    },
  }

  override get title() {
    return game.i18n!.localize(this.options.window.title)
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions & { isFirstRender: boolean }
  ): Promise<foundry.applications.api.ApplicationV2.RenderContext> {
    const context = await super._prepareContext(options)

    return foundry.utils.mergeObject(context, {
      pdfOpenFirstSetting: game.settings!.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST),
      basicSetPdfSetting: game.settings!.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF),
      basicSetPdfChoices: {
        Combined: game.i18n!.localize('GURPS.settingBasicPDFsCombined'),
        Separate: game.i18n!.localize('GURPS.settingBasicPDFsSeparate'),
        Revised: game.i18n!.localize('GURPS.settingBasicPDFsRevised'),
      },
      buttons: [{ type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' }],
    })
  }

  static async #onSubmit(event: SubmitEvent | Event, form: HTMLFormElement, formData: FormDataExtended): Promise<void> {
    // @ts-expect-error: formData.object.basicSetPdfSetting may not be typed in Foundry's API
    await game.settings!.set(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, formData.object.basicSetPdfSetting)
    // @ts-expect-error: formData.object.pdfOpenFirstSetting may not be typed in Foundry's API
    await game.settings!.set(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST, formData.object.pdfOpenFirstSetting)
  }
}
