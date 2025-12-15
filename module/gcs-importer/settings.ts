import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import fields = foundry.data.fields

import {
  MODULE_NAME,
  OVERWRITE_HP_FP,
  OVERWRITE_BODYPLAN,
  SETTING_IMPORT_HP_FP,
  SETTING_IMPORT_BODYPLAN,
  SETTING_IGNORE_IMPORT_NAME,
  SETTING_BLOCK_IMPORT,
  SETTING_AUTOMATICALLY_SET_IGNOREQTY,
  SETTING_IMPORT_EXTENDED_VALUES_GCS,
  SETTING_IMPORT_FILE_ENCODING,
  SETTING_USE_BROWSER_IMPORTER,
  SETTING_ignoreImportQty,
  SETTING_OVERWRITE_PORTRAITS,
  OVERWRITE_PORTRAITS,
  DISPLAY_PRESERVE_QTY_FLAG,
  USE_BROWSER_IMPORTER,
  IMPORT_FILE_ENCODING,
  IMPORT_EXTENDED_VALUES_GCS,
  ONLY_TRUSTED_IMPORT,
  AUTOMATICALLY_SET_IGNORE_QTY,
  OVERWRITE_NAME,
} from './types.js'

const SETTINGS = 'GURPS.importer.settings.title'

export default function initializeGameSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Importer module requires game.settings and game.i18n to be available!')

  // Register old settings for migration purposes
  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
    name: 'GURPS.importer.settings.overwriteHPandFP.name',
    hint: 'GURPS.importer.settings.overwriteHPandFP.hint',
    scope: 'world',
    config: false,
    default: 2,
    type: Number,
    // @ts-expect-error: weird type nonsense
    choices: {
      0: 'GURPS.importer.settings.overwriteHPandFP.yes',
      1: 'GURPS.importer.settings.overwriteHPandFP.no',
      2: 'GURPS.importer.settings.overwriteHPandFP.ask',
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, {
    name: 'GURPS.importer.settings.overwriteBodyPlan.name',
    hint: 'GURPS.importer.settings.overwriteBodyPlan.hint',
    scope: 'world',
    config: false,
    default: 2,
    type: Number,
    // @ts-expect-error: weird type nonsense
    choices: {
      0: 'GURPS.importer.settings.overwriteBodyPlan.yes', // Yes, always overwrite
      1: 'GURPS.importer.settings.overwriteBodyPlan.no', // No, never overwrite
      2: 'GURPS.importer.settings.overwriteBodyPlan.ask', // Ask before overwriting
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IGNORE_IMPORT_NAME, {
    name: 'GURPS.settingImportIgnoreName',
    hint: 'GURPS.settingHintImportIgnoreName',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Ignore import name : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_BLOCK_IMPORT, {
    name: 'GURPS.settingBlockImport',
    hint: 'GURPS.settingHintBlockImport',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Block import : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_AUTOMATICALLY_SET_IGNOREQTY, {
    name: 'GURPS.settingAutoIgnoreQty',
    hint: 'GURPS.settingHintAutoIgnoreQty',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Automatically set ignore QTY : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_EXTENDED_VALUES_GCS, {
    name: 'GURPS.settingImportExtendedValuesGCS',
    hint: 'GURPS.settingImportHintExtendedValuesGCS',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Import Extended Cost/Weight from GCS : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_IMPORT_FILE_ENCODING, {
    name: 'GURPS.settingImportEncoding',
    hint: 'GURPS.settingImportHintEncoding',
    scope: 'world',
    config: false,
    default: 1,
    type: Number,
    choices: {
      // @ts-expect-error: weird type nonsense
      0: 'GURPS.settingImportEncodingISO8859',
      1: 'GURPS.settingImportEncodingUTF8',
    },
    onChange: value => console.log(`Import encoding : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_USE_BROWSER_IMPORTER, {
    name: 'GURPS.settingImportBrowserImporter',
    hint: 'GURPS.settingImportHintBrowserImporter',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`Using non-locally hosted import dialog : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_ignoreImportQty, {
    name: 'GURPS.settingQtyItems',
    hint: 'GURPS.settingHintQtyItems',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Show a 'star' icon for QTY/Count saved items : ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_OVERWRITE_PORTRAITS, {
    name: 'Overwrite Portraits',
    hint: 'Choose whether character portraits are overwritten on import',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`Overwrite Portraits : ${value}`),
  })

  /* ---------------------------------------- */

  // Register new settings
  game.settings.register(GURPS.SYSTEM_NAME, IMPORT_FILE_ENCODING, {
    name: 'GURPS.importer.settings.fileEncoding.name',
    hint: 'GURPS.importer.settings.fileEncoding.hint',
    scope: 'world',
    config: false,
    default: 'UTF8',
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        Latin1: 'GURPS.importer.settings.fileEncoding.options.ISO-8859-1',
        UTF8: 'GURPS.importer.settings.fileEncoding.options.UTF-8',
      },
      initial: 'UTF8',
    }),
    onChange: value => console.log(`Import encoding : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, USE_BROWSER_IMPORTER, {
    name: 'GURPS.importer.settings.useBrowserImporter.name',
    hint: 'GURPS.importer.settings.useBrowserImporter.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: false,
    onChange: value => console.log(`Using non-locally hosted import dialog : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, ONLY_TRUSTED_IMPORT, {
    name: 'GURPS.importer.settings.onlyTrustedPlayersAllowed.name',
    hint: 'GURPS.importer.settings.onlyTrustedPlayersAllowed.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: false,
    onChange: value => console.log(`Block import : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, IMPORT_EXTENDED_VALUES_GCS, {
    name: 'GURPS.importer.settings.importGcsLibExtendedValues.name',
    hint: 'GURPS.importer.settings.importGcsLibExtendedValues.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: false,
    onChange: value => console.log(`Import Extended Cost/Weight from GCS : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_NAME, {
    name: 'GURPS.importer.settings.overwriteName.name',
    hint: 'GURPS.importer.settings.overwriteName.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: false,
    onChange: value => console.log(`Ignore import name : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_PORTRAITS, {
    name: 'GURPS.importer.settings.overwritePortrait.name',
    hint: 'GURPS.importer.settings.overwritePortrait.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: true,
    onChange: value => console.log(`Overwrite Portraits : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_BODYPLAN, {
    name: 'GURPS.importer.settings.overwriteBodyPlan.name',
    hint: 'GURPS.importer.settings.overwriteBodyPlan.hint',
    scope: 'world',
    config: false,
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        overwrite: 'GURPS.importer.settings.overwriteBodyPlan.yes', // Yes, always overwrite
        keep: 'GURPS.importer.settings.overwriteBodyPlan.no', // No, never overwrite
        ask: 'GURPS.importer.settings.overwriteBodyPlan.ask', // Ask before overwriting
      },
      initial: 'ask',
    }),
    onChange: value => {
      // Old setting no longer shows up so set it through this one.
      const oldValue = value === 'overwrite' ? 0 : value === 'keep' ? 1 : 2
      game.settings.set(GURPS.SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, oldValue)
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, OVERWRITE_HP_FP, {
    name: 'GURPS.importer.settings.overwriteHPandFP.name',
    hint: 'GURPS.importer.settings.overwriteHPandFP.hint',
    scope: 'world',
    config: false,
    type: new fields.StringField({
      required: true,
      nullable: false,
      choices: {
        overwrite: 'GURPS.importer.settings.overwriteHPandFP.yes', // Yes, always overwrite
        keep: 'GURPS.importer.settings.overwriteHPandFP.no', // No, never overwrite
        ask: 'GURPS.importer.settings.overwriteHPandFP.ask', // Ask before overwriting
      },
      initial: 'ask',
    }),
    onChange: value => {
      // Old setting no longer shows up so set it through this one.
      const oldValue = value === 'overwrite' ? 0 : value === 'keep' ? 1 : 2
      game.settings.set(GURPS.SYSTEM_NAME, SETTING_IMPORT_HP_FP, oldValue)
    },
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, AUTOMATICALLY_SET_IGNORE_QTY, {
    name: 'GURPS.importer.settings.autoIgnoreImportQty.name',
    hint: 'GURPS.importer.settings.autoIgnoreImportQty.hint',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    default: false,
    onChange: value => console.log(`Automatically set ignore QTY : ${value}`),
  })

  /* ---------------------------------------- */

  game.settings.register(GURPS.SYSTEM_NAME, DISPLAY_PRESERVE_QTY_FLAG, {
    name: 'GURPS.importer.settings.displayPreserveQtyIndicator.name',
    hint: 'GURPS.importer.settings.displayPreserveQtyIndicator.hint',
    scope: 'world',
    config: false,
    // @ts-expect-error: field type mismatch.
    type: new fields.BooleanField(),
    default: true,
    onChange: value => console.log(`Show an indicator for QTY/Count saved items : ${value}`),
  })

  /* ---------------------------------------- */

  // Register menu
  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: SETTINGS,
    label: SETTINGS,
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
