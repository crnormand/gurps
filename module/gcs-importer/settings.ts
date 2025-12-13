import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import fields = foundry.data.fields

import {
  MODULE_NAME,
  OVERWRITE_HP_FP,
  OVERWRITE_BODYPLAN,
  SETTING_IMPORT_HP_FP,
  SETTING_IMPORT_BODYPLAN,
} from './types.js'

const SETTINGS = 'GURPS.importer.settings.title'

export default function initializeGameSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Importer module requires game.settings and game.i18n to be available!')

  // Register old settings for migration purposes
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
    name: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.name'),
    hint: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.hint'),
    scope: 'world',
    config: false,
    default: 2,
    type: Number,
    // @ts-expect-error: weird type nonsense
    choices: {
      0: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.yes'),
      1: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.no'),
      2: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.ask'),
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, {
    name: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.name'),
    hint: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.hint'),
    scope: 'world',
    config: false,
    default: 2,
    type: Number,
    // @ts-expect-error: weird type nonsense
    choices: {
      0: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.yes'), // Yes, always overwrite
      1: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.no'), // No, never overwrite
      2: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.ask'), // Ask before overwriting
    },
  })

  /* ---------------------------------------- */

  // Register new settings
  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP, {
    name: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.name'),
    hint: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.hint'),
    scope: 'world',
    config: false,
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        yes: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.yes'), // Yes, always overwrite
        no: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.no'), // No, never overwrite
        ask: game.i18n.localize('GURPS.importer.settings.overwriteHPandFP.ask'), // Ask before overwriting
      },
      initial: 'ask',
    }),
    onChange: value => {
      // Old setting no longer shows up so set it through this one.
      const oldValue = value === 'yes' ? 0 : value === 'no' ? 1 : 2
      game.settings.set(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, oldValue)
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_BODYPLAN, {
    name: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.name'),
    hint: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.hint'),
    scope: 'world',
    config: false,
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        yes: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.yes'), // Yes, always overwrite
        no: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.no'), // No, never overwrite
        ask: game.i18n.localize('GURPS.importer.settings.overwriteBodyPlan.ask'), // Ask before overwriting
      },
      initial: 'ask',
    }),
    onChange: value => {
      // Old setting no longer shows up so set it through this one.
      const oldValue = value === 'yes' ? 0 : value === 'no' ? 1 : 2
      game.settings.set(GURPS.SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, oldValue)
    },
  })

  // Register menu
  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: game.i18n.localize(SETTINGS),
    label: game.i18n.localize(SETTINGS),
    hint: 'GURPS.importer.settings.hint',
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
