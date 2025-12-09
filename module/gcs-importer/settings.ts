import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import fields = foundry.data.fields

// @deprecated constant
import { SETTING_IMPORT_HP_FP } from '../../lib/miscellaneous-settings.js'

import { MODULE_NAME, OVERWRITE_HP_FP } from './types.js'

const SETTINGS = 'GURPS.Importer.Settings.Title'

export default function initializeGameSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Importer module requires game.settings and game.i18n to be available!')

  // Register old settings for migration purposes
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
    name: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Name'),
    hint: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Hint'),
    scope: 'world',
    config: false,
    default: 2,
    type: Number,
    // @ts-expect-error: weird type nonsense
    choices: {
      0: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Yes'),
      1: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.No'),
      2: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Ask'),
    },
    onChange: value => console.log(`Import of Current HP and FP : ${value}`),
  })

  // Register new settings
  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP, {
    name: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Name'),
    hint: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Hint'),
    scope: 'world',
    config: false,
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        yes: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Yes'), // Yes, always overwrite
        no: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.No'), // No, never overwrite
        ask: game.i18n.localize('GURPS.Importer.Settings.OverwriteHPandFP.Ask'), // Ask before overwriting
      },
      initial: 'ask',
    }),
    onChange: value => {
      // Old setting no longer shows up so set it through this one.
      const oldValue = value === 'yes' ? 0 : value === 'no' ? 1 : 2
      game.settings.set(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, oldValue)
    },
  })

  // Register menu
  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: game.i18n.localize(SETTINGS),
    label: game.i18n.localize(SETTINGS),
    hint: 'GURPS.Importer.Settings.Hint',
    icon: 'fa-light fa-file-import',
    type: ImportSettingsApplication,
    restricted: false,
  })
}

class ImportSettingsApplication extends GurpsSettingsApplication {
  constructor(options?: any) {
    super({ title: game.i18n!.localize(SETTINGS), module: MODULE_NAME, icon: 'fa-light fa-file-import' }, options)
  }
}
