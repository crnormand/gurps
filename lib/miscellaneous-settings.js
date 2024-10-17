'use strict'

import ModifierBucketJournals from '../module/modifier-bucket/select-journals.js'
import Initiative from './initiative.js'
import { i18n } from '../lib/utilities.js'
import { SemanticVersion } from './semver.js'
import { Migration } from './migration.js'
import { ItemImageSettings } from '../module/actor/actor-sheet.js'

export const SYSTEM_NAME = 'gurps'
export const SETTING_MIGRATION_VERSION = 'migration-version'
export const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
export const SETTING_SIMPLE_DAMAGE = 'combat-simple-damage'
export const SETTING_APPLY_DIVISOR = 'combat-apply-divisor'
export const SETTING_BLUNT_TRAUMA = 'combat-blunt-trauma'
export const SETTING_BODY_HITS = 'combat-body-hits'
export const SETTING_LOCATION_MODIFIERS = 'combat-location-modifiers'
export const SETTING_WHISPER_STATUS_EFFECTS = 'whisper-status-effectss'
export const SETTING_CHANGELOG_VERSION = 'changelogVersion'
export const SETTING_SHOW_CHANGELOG = 'showChangelogv2' //change setting to 'reset' for everyone... now that change log only displays changes since last start
export const SETTING_BASICSET_PDF = 'basicsetpdf'
export const SETTING_PDF_OPEN_FIRST = 'pdf-open-first'
export const SETTING_RANGE_TO_BUCKET = 'range-to-bucket'
export const SETTING_MODIFIER_TOOLTIP = 'modifier_tooltip'
export const SETTING_IGNORE_IMPORT_NAME = 'ignore_import_name'
export const SETTING_IMPORT_HP_FP = 'import_hp_fp'
export const SETTING_IMPORT_BODYPLAN = 'import_bodyplan'
export const SETTING_IMPORT_EXTENDED_VALUES_GCS = 'import_extended_values_gcs'
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
export const SETTING_BUCKET_POSITION = 'bucket-position'
export const SETTING_BUCKET_3D6_IMAGE = 'bucket-3d6-image'
export const SETTING_BUCKET_D6_IMAGE = 'bucket-d6-image'
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
export const SETTING_ALT_SHEET = 'alt-sheet'
export const SETTING_PHYSICAL_DICE = 'physical-dice'
export const SETTING_IMPORT_FILE_ENCODING = 'import-file-encoding'
export const SETTING_REMOVE_UNEQUIPPED = 'remove-unequipped-weapons'
export const SETTING_USE_BROWSER_IMPORTER = 'use-browser-importer'
export const SETTING_MANEUVER_UPDATES_MOVE = 'maneuver-updates-move'
export const SETTING_SHOW_CHAT_FOR_REELING_TIRED = 'show-chat-reeling-tired'
export const SETTING_USE_QUINTESSENCE = 'use-quintessence'
export const SETTING_DEFAULT_ADD_ACTION = 'default-add-action'
export const SETTING_PORTRAIT_PATH = 'portrait-path'
export const SETTING_OVERWRITE_PORTRAITS = 'overwrite-portraitsk'
export const SETTING_CTRL_KEY = 'ctrl-key'
export const SETTING_USE_ON_TARGET = 'use-on-target'
export const SETTING_USE_FOUNDRY_ITEMS = 'use-foundry-items'
export const SETTING_SHOW_DEBUG_INFO = 'show-debug-info'
export const SETTING_SHOW_FOUNDRY_GLOBAL_ITEMS = 'show-foundry-global-items'
export const SETTING_SHOW_ITEM_IMAGE = 'show-item-image'

export const VERSION_096 = SemanticVersion.fromString('0.9.6')
export const VERSION_097 = SemanticVersion.fromString('0.9.7')
export const VERSION_0104 = SemanticVersion.fromString('0.10.4')

// TODO encapsulate in an object and provide typed getters and setters
export function initializeSettings() {
  Hooks.once('init', async function () {
    // Game Aid Information Settings ----

    // Show Debug Information for Documents
    game.settings.register(SYSTEM_NAME, SETTING_SHOW_DEBUG_INFO, {
      name: i18n('GURPS.settingShowDebugInfo'),
      hint: i18n('GURPS.settingHintShowDebugInfo'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true,
      onChange: value => console.log(`Show Debug Info for Documents: ${value}`),
    })

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

    game.settings.register(SYSTEM_NAME, SETTING_PHYSICAL_DICE, {
      name: i18n('GURPS.settingUsePhysicalDice'),
      hint: i18n('GURPS.settingHintUsePhysicalDice'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use Physical Dice : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_QUINTESSENCE, {
      name: i18n('GURPS.settingUseQuintessence'),
      hint: i18n('GURPS.settingHintUseQuintessence'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use Quintessence : ${value}`),
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

    game.settings.register(SYSTEM_NAME, 'pdf-open-first', {
      name: i18n('GURPS.settingPDFOpenFirst'),
      hint: i18n('GURPS.settingHintPDFOpenFirst'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
    })

    // GCS/GCA Import Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_USE_FOUNDRY_ITEMS, {
      name: i18n('GURPS.settingUseFoundryItems'),
      hint: i18n('GURPS.settingHintUseFoundryItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Using Foundry Items for Equipment : ${value}`),
    })

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
      onChange: value => console.log(`Automatically set ignore QTY : ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_EXTENDED_VALUES_GCS, {
      name: i18n('GURPS.settingImportExtendedValuesGCS'),
      hint: i18n('GURPS.settingImportHintExtendedValuesGCS'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Import Extended Cost/Weight from GCS : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_FILE_ENCODING, {
      name: i18n('GURPS.settingImportEncoding'),
      hint: i18n('GURPS.settingImportHintEncoding'),
      scope: 'world',
      config: true,
      default: 1,
      type: Number,
      choices: {
        0: i18n('GURPS.settingImportEncodingISO8859'),
        1: i18n('GURPS.settingImportEncodingUTF8'),
      },
      onChange: value => console.log(`Import encoding : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_BROWSER_IMPORTER, {
      name: i18n('GURPS.settingImportBrowserImporter'),
      hint: i18n('GURPS.settingImportHintBrowserImporter'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Using non-locally hosted import dialog : ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_REMOVE_UNEQUIPPED, {
      name: i18n('GURPS.settingRemoveUnequipped'),
      hint: i18n('GURPS.settingHintRemoveUnequipped'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => {
        for (const actor of game.actors.contents) {
          if (actor.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
            if (actor.sheet)
              // Return true if the current game user has observer or owner rights to an actor
              actor.sheet.render()
        }
      },
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

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_FOUNDRY_GLOBAL_ITEMS, {
      name: i18n('GURPS.settingGlobalItems'),
      hint: i18n('GURPS.settingHintGlobalItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'globe' icon for Foundry items : ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_ITEM_IMAGE, {
      name: i18n('GURPS.settingShowItemImage'),
      hint: i18n('GURPS.settingHintShowItemImage'),
      scope: 'client',
      config: false,
      type: Object,
      default: {
        feature: false,
        skill: false,
        spell: false,
        equipment: false,
      },
      onChange: value => console.log(`Show item image in inventory : ${JSON.stringify(value)}`),
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_SHOW_ITEM_IMAGE, {
      name: i18n('GURPS.settingShowItemImage'),
      label: i18n('GURPS.settingLabelShowItemImage'),
      hint: i18n('GURPS.settingHintShowItemImage'),
      type: ItemImageSettings,
      restricted: true,
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

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_POSITION, {
      name: i18n('GURPS.modifierPosition'),
      hint: i18n('GURPS.modifierPositionHint'),
      scope: 'client',
      config: true,
      default: 'left',
      choices: {
        left: i18n('GURPS.modifierPositionLeft'),
        right: i18n('GURPS.modifierPositionRight'),
      },
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier Bucket Position: ${JSON.stringify(value)}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_3D6_IMAGE, {
      name: i18n('GURPS.modifier3d6Image'),
      hint: i18n('GURPS.modifier3d6ImageHint'),
      scope: 'client',
      config: true,
      default: 'systems/gurps/icons/threed6new.png',
      filePicker: true,
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier 3d6 Bucket Image: ${JSON.stringify(value)}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_D6_IMAGE, {
      name: i18n('GURPS.modifierD6Image'),
      hint: i18n('GURPS.modifierD6ImageHint'),
      scope: 'client',
      config: true,
      default: 'systems/gurps/icons/die-new.png',
      filePicker: true,
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier d6 Bucket Image: ${JSON.stringify(value)}`),
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
        TenPenalties: i18n('GURPS.settingRangeStrategyTenPenalties'),
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
        Torso: i18n('GURPS.settingDamageLocationTorso'),
        Random: i18n('GURPS.settingDamageLocationRandom'),
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

    game.settings.register(SYSTEM_NAME, SETTING_BODY_HITS, {
      name: i18n('Damage: Body Hits'),
      hint: i18n(
        'From High Tech 162: Body Hits caps piercing, impaling, and tight-beam burning damage dealt to the torso at 2x max hp, and also adds a 1/6 chance of hitting vitals when targeting the torso.'
      ),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Damage: Body Hits : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_ADD_ACTION, {
      name: i18n('GURPS.settingDefaultADDAction'),
      hint: i18n('GURPS.settingHintefaultADDAction'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        apply: i18n('GURPS.addApplyInjury'),
        quiet: i18n('GURPS.addApplyInjuryQuietly'),
        target: i18n('GURPS.settingApplyBasedOnTarget'),
      },
      default: 'target',
      onChange: value => console.log(`ADD apply option: ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_CHAT_FOR_REELING_TIRED, {
      name: i18n('GURPS.settingShowChatReeling'),
      hint: i18n('GURPS.settingHintShowChatReeling'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Display Reeling/Tired Status in Chat : ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE, {
      name: i18n('GURPS.settingManeuverMove', 'Maneuver Updates Move'),
      hint: i18n(
        'GURPS.settingHintManeuverMove',
        "Setting the maneuver (in combat) updates the actor's move value to the maximum allowed by the maneuver (e.g., none, step, half, etc.)."
      ),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`${SETTING_MANEUVER_UPDATES_MOVE}: ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_ON_TARGET, {
      name: i18n('GURPS.settingOnTarget', 'Use On Target'),
      hint: i18n(
        'GURPS.settingHintOnTarget',
        'Adds additional aiming-related maneuvers from the Pyramid #3/120 article On Target.'
      ),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`${SETTING_USE_ON_TARGET}: ${value}`),
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

    game.settings.register(SYSTEM_NAME, SETTING_PORTRAIT_PATH, {
      name: 'Portrait Path',
      hint: 'Choose where character portraits are stored (in the global Foundry User Data directory, or the local world directory).',
      scope: 'world',
      config: true,
      type: String,
      default: 'global',
      choices: {
        global: 'Global ([Foundry User Data]/Data/images/portaits/',
        local: 'Local ([Foundry User Data]/Data/worlds/[World]/images/portaits/)',
      },
      onChange: value => console.log(`Portrait Path : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_OVERWRITE_PORTRAITS, {
      name: 'Overwrite Portraits',
      hint: 'Choose whether character portraits are overwritten on import',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Overwrite Portraits : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CTRL_KEY, {
      name: 'Set ROLL MODE based on CTRL Key',
      hint: 'Automatically change the ROLL MODE for chat based on whether the CTRL/CMD key is down.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`ROLL MODE on CTRL KEY : ${value}`),
    })
  })
}
