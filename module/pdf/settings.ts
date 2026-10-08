import { SETTING_BASICSET_PDF, SETTING_PDF_OPEN_FIRST, SETTINGS } from './types.js'

export function registerPDFSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | PDF module requires game.settings and game.i18n to be available!')

  // Support for combined or separate Basic Set PDFs
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, {
    name: `${SETTINGS}.basicSet.name`,
    hint: `${SETTINGS}.basicSet.hint`,
    scope: 'world',
    config: false,
    type: String as any,
    choices: {
      Combined: `${SETTINGS}.basicSet.combined`,
      Separate: `${SETTINGS}.basicSet.separate`,
      Revised: `${SETTINGS}.basicSet.revised`,
    },
    default: 'Combined',
    onChange: value => console.log(`Basic Set PDFs : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST, {
    name: `${SETTINGS}.openFirst.name`,
    hint: `${SETTINGS}.openFirst.hint`,
    scope: 'world',
    config: false,
    type: Boolean as any,
    default: false,
    onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
  })
}

export function isOpenFirstPDFSetting(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST) ?? false
}

export function getBasicSetPDFSetting(): 'Combined' | 'Separate' | 'Revised' {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF) as 'Combined' | 'Separate' | 'Revised'
}
