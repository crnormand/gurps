'use strict'

import ModifierBucketJournals from '../module/modifier-bucket/select-journals.js'
import Initiative from './initiative.js'
import { i18n } from '../lib/utilities.js'
import { SemanticVersion } from './semver.js'
import { Migration } from './migration.js'

export const SYSTEM_NAME = 'gurps'
export const SETTING_MIGRATION_VERSION = 'migration-version'
export const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
export const SETTING_SIMPLE_DAMAGE = 'combat-simple-damage'
export const SETTING_APPLY_DIVISOR = 'combat-apply-divisor'
export const SETTING_BLUNT_TRAUMA = 'combat-blunt-trauma'
export const SETTING_LOCATION_MODIFIERS = 'combat-location-modifiers'
export const SETTING_WHISPER_STATUS_EFFECTS = 'whisper-status-effectss'
export const SETTING_CHANGELOG_VERSION = 'changelogVersion'
export const SETTING_SHOW_CHANGELOG = 'showChangelogv2' //change setting to 'reset' for everyone... now that change log only displays changes since last start
export const SETTING_BASICSET_PDF = 'basicsetpdf'
export const SETTING_RANGE_TO_BUCKET = 'range-to-bucket'
export const SETTING_MODIFIER_TOOLTIP = 'modifier_tooltip'
export const SETTING_IGNORE_IMPORT_NAME = 'ignore_import_name'
export const SETTING_IMPORT_HP_FP = 'import_hp_fp'
export const SETTING_IMPORT_BODYPLAN = 'import_bodyplan'
export const SETTING_ENHANCED_INPUT = 'enhanced-numeric-input'
export const SETTING_SHOW_THE_MATH = 'show-the-math'
export const SETTING_AUTOMATIC_ENCUMBRANCE = 'automatic-encumbrance'
export const SETTING_MOOK_DEFAULT_EDITOR = 'mook-default-editor'
export const SETTING_MOOK_DEFAULT = 'mook-default'
export const SETTING_SHOW_SHEET_NAVIGATION = 'sheet-navigation'
export const SETTING_ONLY_GMS_OPEN_ADD = 'only-gms-open-add'
export const SETTING_AUTOMATIC_ONETHIRD = 'automatic-onethird'
export const SETTING_PLAYER_CHAT_PRIVATE = 'player-chat-private'
export const SETTING_TRACKER_DEFAULT_EDITOR = 'tracker-manager'
export const SETTING_TRACKER_TEMPLATES = 'tracker-templates'
export const SETTING_BUCKET_SELECT_JOURNALS = 'bucket-select-journals'
export const SETTING_BUCKET_JOURNALS = 'bucket-journals'
export const SETTING_BUCKET_SCALE = 'bucket-scale-factor'
export const SETTING_FRIGHT_CHECK_TABLE = 'frightcheck-table'
export const SETTING_INITIATIVE_FORMULA = 'initiative-formula'
export const SETTING_RANGE_STRATEGY = 'rangeStrategy'
export const SETTING_USE_CONDITIONAL_INJURY = 'useConditionalInjury'
export const SETTING_CHECK_EQUIPPED = 'check-equipped'
export const SETTING_SHIFT_CLICK_BLIND = 'shift-click-blind'
export const SETTING_SHOW_USER_CREATED = 'show-user-created'
export const SETTING_SHOW_FOUNDRY_CREATED = 'show-foundry-created'
export const SETTING_ignoreImportQty = 'ignoreImportQty'
export const SETTING_BLOCK_IMPORT = 'block-import'
export const SETTING_SHOW_3D6 = 'show-3d6'
export const SETTING_CONVERT_RANGED = 'convert-ranged'
export const SETTING_MANEUVER_VISIBILITY = 'maneuver-visibility'
export const SETTING_MANEUVER_DETAIL = 'maneuver-detail'
export const SETTING_AUTOMATICALLY_SET_IGNOREQTY = 'auto-ignore-qty'

export const VERSION_096 = SemanticVersion.fromString('0.9.6')
export const VERSION_097 = SemanticVersion.fromString('0.9.7')
export const VERSION_0104 = SemanticVersion.fromString('0.10.4')

export function initializeSettings() {
  Hooks.once('init', async function () {
    // Game Aid Information Settings ----

    // Keep track of the last version number
    game.settings.register(SYSTEM_NAME, SETTING_CHANGELOG_VERSION, {
      name: 'Changelog Version',
      scope: 'client',
      config: false,
      type: String,
      default: '0.0.0',
      onChange: value => console.log(`Change Log version : ${value}`),
    })

    // Keep track of the last version number
    game.settings.register(SYSTEM_NAME, SETTING_MIGRATION_VERSION, {
      name: 'Migration Version',
      scope: 'world',
      config: false,
      type: String,
      default: '0.0.0',
      onChange: value => console.log(`Migration Log version : ${value}`),
    })

    // In case the user wants to see what changed between versions
    game.settings.register(SYSTEM_NAME, SETTING_SHOW_CHANGELOG, {
      name: i18n('GURPS.settingShowReadMe'),
      hint: i18n('GURPS.settingHintShowReadMe'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show Change Log : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_3D6, {
      name: i18n('GURPS.settingShowDiceRoller'),
      hint: i18n('GURPS.settingHintShowDiceRoller'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show Dice Roller : ${value}`),
    })

    // PDF Configuration ----

    // Support for combined or separate Basic Set PDFs
    game.settings.register(SYSTEM_NAME, 'basicsetpdf', {
      name: i18n('GURPS.settingBasicPDFs'),
      hint: i18n('GURPS.settingHintBasicPDFs'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Combined: i18n('GURPS.settingBasicPDFsCombined'),
        Separate: i18n('GURPS.settingBasicPDFsSeparate'),
      },
      default: 'Combined',
      onChange: value => console.log(`Basic Set PDFs : ${value}`),
    })

    // GCS/GCA Import Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_IGNORE_IMPORT_NAME, {
      name: i18n('GURPS.settingImportIgnoreName'),
      hint: i18n('GURPS.settingHintImportIgnoreName'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Ignore import name : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLOCK_IMPORT, {
      name: i18n('GURPS.settingBlockImport'),
      hint: i18n('GURPS.settingHintBlockImport'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Block import : ${value}`),
    })
    
    
    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATICALLY_SET_IGNOREQTY, {
      name: i18n('GURPS.settingAutoIgnoreQty'),
      hint: i18n('GURPS.settingHintAutoIgnoreQty'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Autmatically set ignore QTY : ${value}`),
    })
    

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
      name: i18n('GURPS.settingImportHPAndFP'),
      hint: i18n('GURPS.settingHintImportHPAndFP'),
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: i18n('GURPS.settingImportHPAndFPUseFile'),
        1: i18n('GURPS.settingImportHPAndFPIgnore'),
        2: i18n('GURPS.settingImportHPAndFPAsk'),
      },
      onChange: value => console.log(`Import of Current HP and FP : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, {
      name: i18n('GURPS.settingImportBodyPlan'),
      hint: i18n('GURPS.settingImportHintBodyPlan'),
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: i18n('GURPS.settingImportBodyPlanUseFile'),
        1: i18n('GURPS.settingImportBodyPlanIgnore'),
        2: i18n('GURPS.settingImportBodyPlanAsk'),
      },
      onChange: value => console.log(`Import of Body Plan : ${value}`),
    })

    // Actor Sheet Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_SHEET_NAVIGATION, {
      name: i18n('GURPS.settingShowNavigation'),
      hint: i18n('GURPS.settingHintShowNavigation'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show navigation footer : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ENHANCED_INPUT, {
      name: i18n('GURPS.settingEnhancedInput'),
      hint: i18n('GURPS.settingHintEnhancedInput'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Use enhanced numeric input : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ENCUMBRANCE, {
      name: i18n('GURPS.settingCalculateEnc'),
      hint: i18n('GURPS.settingHintCalculateEnc'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic encumbrance : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CHECK_EQUIPPED, {
      name: i18n('GURPS.settingUseEquipped'),
      hint: i18n('GURPS.settingHintUseEquipped'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Check 'Equipped' items in weight calculation : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_USER_CREATED, {
      name: i18n('GURPS.settingFlagUserCreated'),
      hint: i18n('GURPS.settingHintFlagUserCreated'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'saved' icon for user created items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_FOUNDRY_CREATED, {
      name: i18n('GURPS.settingFlagItems'),
      hint: i18n('GURPS.settingHintFlagItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'star' icon for Foundry items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ignoreImportQty, {
      name: i18n('GURPS.settingQtyItems'),
      hint: i18n('GURPS.settingHintQtyItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'star' icon for QTY/Count saved items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CONVERT_RANGED, {
      name: i18n('GURPS.settingConvertRanged'),
      hint: i18n('GURPS.settingHintConvertRanged'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Mulitple ranged columns during import : ${value}`),
    })

    // Modifier Bucket Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_MODIFIER_TOOLTIP, {
      name: i18n('GURPS.modifierShowOnMouseOver'),
      hint: i18n('GURPS.modifierShowOnMouseOverHint'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Modifier Tooltip on hover : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_RANGE_TO_BUCKET, {
      name: i18n('GURPS.modifierAddRangeRuler'),
      hint: i18n('GURPS.modifierAddRangeRulerHint'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Automatically add range ruler mod to bucket : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_SCALE, {
      name: i18n('GURPS.modifierViewScale'),
      hint: i18n('GURPS.modifierViewScaleHint'),
      scope: 'client',
      config: true,
      default: 1.0,
      type: Number,
      choices: {
        0.8: i18n('GURPS.modifierScaleVerySmall'),
        0.9: i18n('GURPS.modifierScaleSmall'),
        1.0: i18n('GURPS.modifierScaleNormal'),
        1.1: i18n('GURPS.modifierScaleLarge'),
        1.2: i18n('GURPS.modifierScaleVeryLarge'),
      },
      onChange: value => console.log(`Modifier Bucket Scale: ${value}`),
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_BUCKET_SELECT_JOURNALS, {
      name: i18n('GURPS.modifierSelectJournals'),
      hint: i18n('GURPS.modifierSelectJournalsHint'),
      label: i18n('GURPS.modifierSelectJournalButton'),
      type: ModifierBucketJournals,
      restricted: false,
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_JOURNALS, {
      name: i18n('GURPS.modifierJournals'),
      scope: 'client',
      config: false,
      type: Object,
      default: {},
      onChange: value => console.log(`Updated Modifier Bucket Journals: ${JSON.stringify(value)}`),
    })

    // Combat options ----

    game.settings.register(SYSTEM_NAME, SETTING_RANGE_STRATEGY, {
      name: i18n('GURPS.settingRangeStrategy'),
      hint: i18n('GURPS.settingHintRangeStrategy'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Standard: i18n('GURPS.settingRangeStrategyStandard'),
        Simplified: i18n('GURPS.settingRangeStrategyRangeBands'),
      },
      default: 'Standard',
      onChange: value => GURPS.rangeObject.update(),
    })

    game.settings.register(SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
      name: i18n('GURPS.settingCombatInitiative'),
      hint: i18n('GURPS.settingHintCombatInitiative'),
      scope: 'world',
      config: true,
      type: String,
      default: Initiative.defaultFormula(),
      onChange: value => GURPS.setInitiativeFormula(true),
    })

    // Damage calculation options ----

    game.settings.register(SYSTEM_NAME, SETTING_ONLY_GMS_OPEN_ADD, {
      name: i18n('GURPS.settingDamageRestrictADD'),
      hint: i18n('GURPS.settingHintDamageRestrictADD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Only GMs can open ADD : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
      name: i18n('GURPS.settingDamageSimpleADD'),
      hint: i18n('GURPS.settingHintDamageSimpleADD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use simple Apply Damage Dialog : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
      name: i18n('GURPS.settingDamageLocation'),
      hint: i18n('GURPS.settingHintDamageLocation'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Torso: 'Torso',
        Random: 'Random',
      },
      default: 'Torso',
      onChange: value => console.log(`Default hit location: ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_APPLY_DIVISOR, {
      name: i18n('GURPS.settingDamageAD'),
      hint: i18n('GURPS.settingHintDamageAD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Armor Divisor : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLUNT_TRAUMA, {
      name: i18n('GURPS.settingDamageBluntTrauma'),
      hint: i18n('GURPS.settingHintDamageBluntTrauma'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Blunt Trauma : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_LOCATION_MODIFIERS, {
      name: i18n('GURPS.settingDamageLocationMods'),
      hint: i18n('GURPS.settingHintDamageLocationMods'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Location Modifiers : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_THE_MATH, {
      name: i18n('GURPS.settingDamageMath'),
      hint: i18n('GURPS.settingHintDamageMath'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Always expand SHOW THE MATH : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_CONDITIONAL_INJURY, {
      name: i18n('GURPS.settingDamageCondInjury'),
      hint: i18n('GURPS.settingHintDamagCondInjury'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => GURPS.ConditionalInjury.update(),
    })

    // Status Effects Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_WHISPER_STATUS_EFFECTS, {
      name: i18n('GURPS.settingStatusWhisper'),
      hint: i18n('GURPS.settingHintStatusWhisper'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Whisper Status Effects : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ONETHIRD, {
      name: i18n('GURPS.settingStatusReeling'),
      hint: i18n('GURPS.settingHintStatusReeling'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic reeling/tired : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY, {
      name: i18n('GURPS.settingManeuverVisibility'),
      hint: i18n('GURPS.settingHintManeuverVisibility'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        NoOne: i18n('GURPS.settingManeuverNoOne'),
        GMAndOwner: i18n('GURPS.settingManeuverGMOnly'),
        Everyone: i18n('GURPS.settingManeuverEveryone'),
      },
      default: 'NoOne',
      onChange: value => {
        console.log(`${SETTING_MANEUVER_VISIBILITY}: ${value}`)
        Migration.migrateToManeuvers(true)
      },
    })

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_DETAIL, {
      name: i18n('GURPS.settingManeuverDetail'),
      hint: i18n('GURPS.settingHintManeuverDetail'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Full: i18n('GURPS.settingManeuverDetailFull'),
        NoFeint: i18n('GURPS.settingManeuverDetailNoFeint'),
        General: i18n('GURPS.settingManeuverDetailGeneral'),
      },
      default: 'General',
      onChange: value => {
        console.log(`${SETTING_MANEUVER_DETAIL}: ${value}`)
        Migration.migrateToManeuvers(true)
      },
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHIFT_CLICK_BLIND, {
      name: i18n('GURPS.settingPlayerBlindRoll'),
      hint: i18n('GURPS.settingHintPlayerBlindRoll'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`SHIFT Click does a Blind roll for players : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_PLAYER_CHAT_PRIVATE, {
      name: i18n('GURPS.settingPlayerChatPrivate'),
      hint: i18n('GURPS.settingHintPlayerChatPrivate'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Player chat private : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_FRIGHT_CHECK_TABLE, {
      name: 'Fright Check table name',
      scope: 'world',
      config: false,
      type: String,
      default: 'Fright Check',
      onChange: value => console.log(`Fright Check table name : ${value}`),
    })
  })
}
