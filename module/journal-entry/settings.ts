import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import { MODULE_NAME, SETTING_BASICSET_PDF, SETTING_PDF_OPEN_FIRST } from './types.js'

export function registerPDFSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | PDF module requires game.settings and game.i18n to be available!')

  // Support for combined or separate Basic Set PDFs
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, {
    name: 'GURPS.settingBasicPDFs',
    hint: 'GURPS.settingHintBasicPDFs',
    scope: 'world',
    config: false,
    type: String as any,
    choices: {
      Combined: 'GURPS.settingBasicPDFsCombined',
      Separate: 'GURPS.settingBasicPDFsSeparate',
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
    default: false,
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

class PDFSettingsApplication extends GurpsSettingsApplication {
  constructor(options?: any) {
    super(
      { title: game.i18n!.localize('GURPS.pdf.settingsName'), module: MODULE_NAME, icon: 'fa-solid fa-file-pdf' },
      options
    )
  }
}
