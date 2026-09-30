import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import { ICON, MODULE_NAME, SETTINGS } from './types.js'

class PdfSettingsApplication extends GurpsSettingsApplication {
  constructor(options?: any) {
    super({ title: game.i18n!.localize(`${SETTINGS}.button`), module: MODULE_NAME, icon: ICON }, options)
  }
}

export function registerPDFSettingsApp() {
  game.settings?.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: `${SETTINGS}.name`,
    label: `${SETTINGS}.button`,
    hint: `${SETTINGS}.hint`,
    icon: ICON,
    type: PdfSettingsApplication,
    restricted: false,
  })
}
//   name: 'GURPS.pdf.settingsName',
//   hint: 'GURPS.pdf.settingsHint',
//   label: 'GURPS.pdf.settingsButton',
