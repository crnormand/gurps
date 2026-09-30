import { SETTING_BASICSET_PDF, SETTING_PDF_OPEN_FIRST, SETTINGS } from './types.js'

export function registerPDFSettings() {
  if (!game.settings) throw new Error('GURPS | PDF module requires game.settings to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF, {
    name: `${SETTINGS}.basicSet.name`,
    hint: `${SETTINGS}.basicSet.hint`,
    scope: 'world',
    config: false,
    type: String as any,
    // @ts-expect-error: choices may not be typed in Foundry's API
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
    default: false, // Migrate old setting if needed
    onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
  })
}

export function isOpenFirstPDFSetting(): boolean {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_PDF_OPEN_FIRST) ?? false
}

export function getBasicSetPDFSetting(): 'Combined' | 'Separate' | 'Revised' {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_BASICSET_PDF) as 'Combined' | 'Separate' | 'Revised'
}
