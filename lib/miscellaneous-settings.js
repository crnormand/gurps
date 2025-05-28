'use strict'

import { ItemImageSettings } from '../module/actor/actor-sheet.js'
import { TaggedModifierSettings } from '../module/actor/effect-modifier-popout.js'
import ModifierBucketJournals from '../module/modifier-bucket/select-journals.js'
import { QuickRollSettings } from '../module/token/quick-roll-settings.js'
import Initiative from './initiative.js'
import { SemanticVersion } from './semver.js'

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

export const SETTING_USE_QUICK_ROLLS = 'use-quick-rolls'
export const SETTING_SHOW_CONFIRMATION_ROLL_DIALOG = 'show-confirmation-roll-dialog'
export const SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = 'allow-roll-based-on-maneuver'
export const SETTING_ALLOW_TARGETED_ROLLS = 'allow-targeted-rolls'
export const SETTING_USE_TAGGED_MODIFIERS = 'use-tagged-modifiers'
export const SETTING_MODIFY_DICE_PLUS_ADDS = 'modify-dice-plus-adds'
export const SETTING_USE_MAX_ACTIONS = 'use-max-actions'
export const SETTING_ALLOW_AFTER_MAX_ACTIONS = 'allow-after-max-actions'
export const SETTING_ADD_SHOCK_AT_TURN = 'add-shock-at-turn'
export const SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START = 'allow-rolls-before-combat-start'
export const SETTING_ADD_CUMULATIVE_PARRY_PENALTIES = 'add-cumulative-parry-penalties'

export const VERSION_096 = SemanticVersion.fromString('0.9.6')
export const VERSION_097 = SemanticVersion.fromString('0.9.7')
export const VERSION_0104 = SemanticVersion.fromString('0.10.4')

// TODO encapsulate in an object and provide typed getters and setters
export function initializeSettings() {
  Hooks.once('init', async function () {
    // Game Aid Information Settings ----

    // Show Debug Information for Documents
    game.settings.register(SYSTEM_NAME, SETTING_SHOW_DEBUG_INFO, {
      name: game.i18n.localize('GURPS.settingShowDebugInfo'),
      hint: game.i18n.localize('GURPS.settingHintShowDebugInfo'),
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
      name: game.i18n.localize('GURPS.settingShowReadMe'),
      hint: game.i18n.localize('GURPS.settingHintShowReadMe'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show Change Log : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_3D6, {
      name: game.i18n.localize('GURPS.settingShowDiceRoller'),
      hint: game.i18n.localize('GURPS.settingHintShowDiceRoller'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show Dice Roller : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_PHYSICAL_DICE, {
      name: game.i18n.localize('GURPS.settingUsePhysicalDice'),
      hint: game.i18n.localize('GURPS.settingHintUsePhysicalDice'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use Physical Dice : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_QUINTESSENCE, {
      name: game.i18n.localize('GURPS.settingUseQuintessence'),
      hint: game.i18n.localize('GURPS.settingHintUseQuintessence'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use Quintessence : ${value}`),
    })

    // PDF Configuration ----

    // Support for combined or separate Basic Set PDFs
    game.settings.register(SYSTEM_NAME, 'basicsetpdf', {
      name: game.i18n.localize('GURPS.settingBasicPDFs'),
      hint: game.i18n.localize('GURPS.settingHintBasicPDFs'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Combined: game.i18n.localize('GURPS.settingBasicPDFsCombined'),
        Separate: game.i18n.localize('GURPS.settingBasicPDFsSeparate'),
      },
      default: 'Combined',
      onChange: value => console.log(`Basic Set PDFs : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, 'pdf-open-first', {
      name: game.i18n.localize('GURPS.settingPDFOpenFirst'),
      hint: game.i18n.localize('GURPS.settingHintPDFOpenFirst'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`On multiple Page Refs open first PDF found : ${value}`),
    })

    // GCS/GCA Import Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_USE_FOUNDRY_ITEMS, {
      name: game.i18n.localize('GURPS.settingUseFoundryItems'),
      hint: game.i18n.localize('GURPS.settingHintUseFoundryItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Using Foundry Items for Equipment : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IGNORE_IMPORT_NAME, {
      name: game.i18n.localize('GURPS.settingImportIgnoreName'),
      hint: game.i18n.localize('GURPS.settingHintImportIgnoreName'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Ignore import name : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLOCK_IMPORT, {
      name: game.i18n.localize('GURPS.settingBlockImport'),
      hint: game.i18n.localize('GURPS.settingHintBlockImport'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Block import : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATICALLY_SET_IGNOREQTY, {
      name: game.i18n.localize('GURPS.settingAutoIgnoreQty'),
      hint: game.i18n.localize('GURPS.settingHintAutoIgnoreQty'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Automatically set ignore QTY : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
      name: game.i18n.localize('GURPS.settingImportHPAndFP'),
      hint: game.i18n.localize('GURPS.settingHintImportHPAndFP'),
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: game.i18n.localize('GURPS.settingImportHPAndFPUseFile'),
        1: game.i18n.localize('GURPS.settingImportHPAndFPIgnore'),
        2: game.i18n.localize('GURPS.settingImportHPAndFPAsk'),
      },
      onChange: value => console.log(`Import of Current HP and FP : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, {
      name: game.i18n.localize('GURPS.settingImportBodyPlan'),
      hint: game.i18n.localize('GURPS.settingImportHintBodyPlan'),
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: game.i18n.localize('GURPS.settingImportBodyPlanUseFile'),
        1: game.i18n.localize('GURPS.settingImportBodyPlanIgnore'),
        2: game.i18n.localize('GURPS.settingImportBodyPlanAsk'),
      },
      onChange: value => console.log(`Import of Body Plan : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_EXTENDED_VALUES_GCS, {
      name: game.i18n.localize('GURPS.settingImportExtendedValuesGCS'),
      hint: game.i18n.localize('GURPS.settingImportHintExtendedValuesGCS'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Import Extended Cost/Weight from GCS : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_FILE_ENCODING, {
      name: game.i18n.localize('GURPS.settingImportEncoding'),
      hint: game.i18n.localize('GURPS.settingImportHintEncoding'),
      scope: 'world',
      config: true,
      default: 1,
      type: Number,
      choices: {
        0: game.i18n.localize('GURPS.settingImportEncodingISO8859'),
        1: game.i18n.localize('GURPS.settingImportEncodingUTF8'),
      },
      onChange: value => console.log(`Import encoding : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_BROWSER_IMPORTER, {
      name: game.i18n.localize('GURPS.settingImportBrowserImporter'),
      hint: game.i18n.localize('GURPS.settingImportHintBrowserImporter'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Using non-locally hosted import dialog : ${value}`),
    })

    // Actor Sheet Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_SHEET_NAVIGATION, {
      name: game.i18n.localize('GURPS.settingShowNavigation'),
      hint: game.i18n.localize('GURPS.settingHintShowNavigation'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show navigation footer : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ENHANCED_INPUT, {
      name: game.i18n.localize('GURPS.settingEnhancedInput'),
      hint: game.i18n.localize('GURPS.settingHintEnhancedInput'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Use enhanced numeric input : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ENCUMBRANCE, {
      name: game.i18n.localize('GURPS.settingCalculateEnc'),
      hint: game.i18n.localize('GURPS.settingHintCalculateEnc'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic encumbrance : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CHECK_EQUIPPED, {
      name: game.i18n.localize('GURPS.settingUseEquipped'),
      hint: game.i18n.localize('GURPS.settingHintUseEquipped'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Check 'Equipped' items in weight calculation : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_REMOVE_UNEQUIPPED, {
      name: game.i18n.localize('GURPS.settingRemoveUnequipped'),
      hint: game.i18n.localize('GURPS.settingHintRemoveUnequipped'),
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
      name: game.i18n.localize('GURPS.settingFlagUserCreated'),
      hint: game.i18n.localize('GURPS.settingHintFlagUserCreated'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'saved' icon for user created items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_FOUNDRY_CREATED, {
      name: game.i18n.localize('GURPS.settingFlagItems'),
      hint: game.i18n.localize('GURPS.settingHintFlagItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'star' icon for Foundry items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_FOUNDRY_GLOBAL_ITEMS, {
      name: game.i18n.localize('GURPS.settingGlobalItems'),
      hint: game.i18n.localize('GURPS.settingHintGlobalItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'globe' icon for Foundry items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ignoreImportQty, {
      name: game.i18n.localize('GURPS.settingQtyItems'),
      hint: game.i18n.localize('GURPS.settingHintQtyItems'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'star' icon for QTY/Count saved items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CONVERT_RANGED, {
      name: game.i18n.localize('GURPS.settingConvertRanged'),
      hint: game.i18n.localize('GURPS.settingHintConvertRanged'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Mulitple ranged columns during import : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_ITEM_IMAGE, {
      name: game.i18n.localize('GURPS.settingShowItemImage'),
      hint: game.i18n.localize('GURPS.settingHintShowItemImage'),
      scope: 'client',
      config: false,
      type: Object,
      default: {
        feature: true,
        skill: true,
        spell: true,
        equipment: true,
      },
      onChange: value => console.log(`Show item image in inventory : ${JSON.stringify(value)}`),
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_SHOW_ITEM_IMAGE, {
      name: game.i18n.localize('GURPS.settingShowItemImage'),
      label: game.i18n.localize('GURPS.settingLabelShowItemImage'),
      hint: game.i18n.localize('GURPS.settingHintShowItemImage'),
      type: ItemImageSettings,
      restricted: true,
    })

    // Modifier Bucket Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_MODIFIER_TOOLTIP, {
      name: game.i18n.localize('GURPS.modifierShowOnMouseOver'),
      hint: game.i18n.localize('GURPS.modifierShowOnMouseOverHint'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Modifier Tooltip on hover : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_RANGE_TO_BUCKET, {
      name: game.i18n.localize('GURPS.modifierAddRangeRuler'),
      hint: game.i18n.localize('GURPS.modifierAddRangeRulerHint'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Automatically add range ruler mod to bucket : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_SCALE, {
      name: game.i18n.localize('GURPS.modifierViewScale'),
      hint: game.i18n.localize('GURPS.modifierViewScaleHint'),
      scope: 'client',
      config: true,
      default: 1.0,
      type: Number,
      choices: {
        0.8: game.i18n.localize('GURPS.modifierScaleVerySmall'),
        0.9: game.i18n.localize('GURPS.modifierScaleSmall'),
        1.0: game.i18n.localize('GURPS.modifierScaleNormal'),
        1.1: game.i18n.localize('GURPS.modifierScaleLarge'),
        1.2: game.i18n.localize('GURPS.modifierScaleVeryLarge'),
      },
      onChange: value => console.log(`Modifier Bucket Scale: ${value}`),
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_BUCKET_SELECT_JOURNALS, {
      name: game.i18n.localize('GURPS.modifierSelectJournals'),
      hint: game.i18n.localize('GURPS.modifierSelectJournalsHint'),
      label: game.i18n.localize('GURPS.modifierSelectJournalButton'),
      type: ModifierBucketJournals,
      restricted: false,
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_JOURNALS, {
      name: game.i18n.localize('GURPS.modifierJournals'),
      scope: 'client',
      config: false,
      type: Object,
      default: {},
      onChange: value => console.log(`Updated Modifier Bucket Journals: ${JSON.stringify(value)}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_POSITION, {
      name: game.i18n.localize('GURPS.modifierPosition'),
      hint: game.i18n.localize('GURPS.modifierPositionHint'),
      scope: 'client',
      config: true,
      default: 'left',
      choices: {
        left: game.i18n.localize('GURPS.modifierPositionLeft'),
        right: game.i18n.localize('GURPS.modifierPositionRight'),
      },
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier Bucket Position: ${JSON.stringify(value)}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_3D6_IMAGE, {
      name: game.i18n.localize('GURPS.modifier3d6Image'),
      hint: game.i18n.localize('GURPS.modifier3d6ImageHint'),
      scope: 'client',
      config: true,
      default: 'systems/gurps/icons/threed6new.png',
      filePicker: true,
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier 3d6 Bucket Image: ${JSON.stringify(value)}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BUCKET_D6_IMAGE, {
      name: game.i18n.localize('GURPS.modifierD6Image'),
      hint: game.i18n.localize('GURPS.modifierD6ImageHint'),
      scope: 'client',
      config: true,
      default: 'systems/gurps/icons/die-new.png',
      filePicker: true,
      requiresReload: true,
      onChange: value => console.log(`Updated Modifier d6 Bucket Image: ${JSON.stringify(value)}`),
    })

    // Combat options ----

    game.settings.register(SYSTEM_NAME, SETTING_RANGE_STRATEGY, {
      name: game.i18n.localize('GURPS.settingRangeStrategy'),
      hint: game.i18n.localize('GURPS.settingHintRangeStrategy'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Standard: game.i18n.localize('GURPS.settingRangeStrategyStandard'),
        Simplified: game.i18n.localize('GURPS.settingRangeStrategyRangeBands'),
        TenPenalties: game.i18n.localize('GURPS.settingRangeStrategyTenPenalties'),
      },
      default: 'Standard',
      onChange: value => GURPS.rangeObject.update(),
    })

    game.settings.register(SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
      name: game.i18n.localize('GURPS.settingCombatInitiative'),
      hint: game.i18n.localize('GURPS.settingHintCombatInitiative'),
      scope: 'world',
      config: true,
      type: String,
      default: Initiative.defaultFormula(),
      onChange: value => GURPS.setInitiativeFormula(true),
    })

    // Damage calculation options ----

    game.settings.register(SYSTEM_NAME, SETTING_ONLY_GMS_OPEN_ADD, {
      name: game.i18n.localize('GURPS.settingDamageRestrictADD'),
      hint: game.i18n.localize('GURPS.settingHintDamageRestrictADD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Only GMs can open ADD : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
      name: game.i18n.localize('GURPS.settingDamageSimpleADD'),
      hint: game.i18n.localize('GURPS.settingHintDamageSimpleADD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use simple Apply Damage Dialog : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
      name: game.i18n.localize('GURPS.settingDamageLocation'),
      hint: game.i18n.localize('GURPS.settingHintDamageLocation'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Torso: game.i18n.localize('GURPS.settingDamageLocationTorso'),
        Random: game.i18n.localize('GURPS.settingDamageLocationRandom'),
      },
      default: 'Torso',
      onChange: value => console.log(`Default hit location: ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_APPLY_DIVISOR, {
      name: game.i18n.localize('GURPS.settingDamageAD'),
      hint: game.i18n.localize('GURPS.settingHintDamageAD'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Armor Divisor : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLUNT_TRAUMA, {
      name: game.i18n.localize('GURPS.settingDamageBluntTrauma'),
      hint: game.i18n.localize('GURPS.settingHintDamageBluntTrauma'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Blunt Trauma : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_LOCATION_MODIFIERS, {
      name: game.i18n.localize('GURPS.settingDamageLocationMods'),
      hint: game.i18n.localize('GURPS.settingHintDamageLocationMods'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Location Modifiers : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_THE_MATH, {
      name: game.i18n.localize('GURPS.settingDamageMath'),
      hint: game.i18n.localize('GURPS.settingHintDamageMath'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Always expand SHOW THE MATH : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_CONDITIONAL_INJURY, {
      name: game.i18n.localize('GURPS.settingDamageCondInjury'),
      hint: game.i18n.localize('GURPS.settingHintDamagCondInjury'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => GURPS.ConditionalInjury.update(),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BODY_HITS, {
      name: game.i18n.localize('Damage: Body Hits'),
      hint: game.i18n.localize(
        'From High Tech 162: Body Hits caps piercing, impaling, and tight-beam burning damage dealt to the torso at 2x max hp, and also adds a 1/6 chance of hitting vitals when targeting the torso.'
      ),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Damage: Body Hits : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_ADD_ACTION, {
      name: game.i18n.localize('GURPS.settingDefaultADDAction'),
      hint: game.i18n.localize('GURPS.settingHintefaultADDAction'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        apply: game.i18n.localize('GURPS.addApplyInjury'),
        quiet: game.i18n.localize('GURPS.addApplyInjuryQuietly'),
        target: game.i18n.localize('GURPS.settingApplyBasedOnTarget'),
      },
      default: 'target',
      onChange: value => console.log(`ADD apply option: ${value}`),
    })

    // Status Effects Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_WHISPER_STATUS_EFFECTS, {
      name: game.i18n.localize('GURPS.settingStatusWhisper'),
      hint: game.i18n.localize('GURPS.settingHintStatusWhisper'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Whisper Status Effects : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ONETHIRD, {
      name: game.i18n.localize('GURPS.settingStatusReeling'),
      hint: game.i18n.localize('GURPS.settingHintStatusReeling'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic reeling/tired : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_CHAT_FOR_REELING_TIRED, {
      name: game.i18n.localize('GURPS.settingShowChatReeling'),
      hint: game.i18n.localize('GURPS.settingHintShowChatReeling'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Display Reeling/Tired Status in Chat : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY, {
      name: game.i18n.localize('GURPS.settingManeuverVisibility'),
      hint: game.i18n.localize('GURPS.settingHintManeuverVisibility'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        NoOne: game.i18n.localize('GURPS.settingManeuverNoOne'),
        GMAndOwner: game.i18n.localize('GURPS.settingManeuverGMOnly'),
        Everyone: game.i18n.localize('GURPS.settingManeuverEveryone'),
      },
      default: 'NoOne',
      onChange: value => {
        console.log(`${SETTING_MANEUVER_VISIBILITY}: ${value}`)
        // Re-draw token effects immediately
        game.scenes.active.tokens.forEach(e => e.object.drawEffects())
      },
    })

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_DETAIL, {
      name: game.i18n.localize('GURPS.settingManeuverDetail'),
      hint: game.i18n.localize('GURPS.settingHintManeuverDetail'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Full: game.i18n.localize('GURPS.settingManeuverDetailFull'),
        NoFeint: game.i18n.localize('GURPS.settingManeuverDetailNoFeint'),
        General: game.i18n.localize('GURPS.settingManeuverDetailGeneral'),
      },
      default: 'General',
      onChange: value => {
        console.log(`${SETTING_MANEUVER_DETAIL}: ${value}`)
        // Re-draw token effects immediately
        game.scenes.active.tokens.forEach(e => e.object.drawEffects())
      },
    })

    game.settings.register(SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE, {
      name: game.i18n.localize('GURPS.settingManeuverMove', 'Maneuver Updates Move'),
      hint: game.i18n.localize(
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
      name: game.i18n.localize('GURPS.settingOnTarget', 'Use On Target'),
      hint: game.i18n.localize(
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
      name: game.i18n.localize('GURPS.settingPlayerBlindRoll'),
      hint: game.i18n.localize('GURPS.settingHintPlayerBlindRoll'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`SHIFT Click does a Blind roll for players : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_PLAYER_CHAT_PRIVATE, {
      name: game.i18n.localize('GURPS.settingPlayerChatPrivate'),
      hint: game.i18n.localize('GURPS.settingHintPlayerChatPrivate'),
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

    game.settings.register(SYSTEM_NAME, SETTING_USE_QUICK_ROLLS, {
      name: game.i18n.localize('GURPS.settingUseQuickRolls'),
      hint: game.i18n.localize('GURPS.settingHintUseQuickRolls'),
      scope: 'world',
      config: false,
      type: Object,
      default: {
        enabled: true,
        attributeChecks: true,
        otherChecks: true,
        attackChecks: true,
        defenseChecks: true,
        markedChecks: true,
      },
      onChange: async value => {
        console.log(`Use Quick Roll configuration : ${JSON.stringify(value)}`)
      },
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_USE_QUICK_ROLLS, {
      name: game.i18n.localize('GURPS.settingUseQuickRolls'),
      label: game.i18n.localize('GURPS.settingLabelUseQuickRolls'),
      hint: game.i18n.localize('GURPS.settingHintUseQuickRolls'),
      type: QuickRollSettings,
      restricted: true,
    })

    /**
     * TODO: Automatically set to true if useTaggedModifiers:autoAdd is true.
     */
    game.settings.register(SYSTEM_NAME, SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, {
      name: game.i18n.localize('GURPS.settingShowConfirmationRollDialog'),
      hint: game.i18n.localize('GURPS.settingHintShowConfirmationRoll'),
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => {
        if (value === false) {
          const taggedModifiers = game.settings.get(SYSTEM_NAME, SETTING_USE_TAGGED_MODIFIERS)
          if (taggedModifiers && taggedModifiers.autoAdd) {
            game.settings.set(SYSTEM_NAME, SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true) // revert to true
            const message = `Show Confirmation Roll Dialog cannot be disabled when "Use Tagged Modifiers" is set to autoAdd.`
            ui.notifications.error(message)
          }
        }
        console.log(`Show Confirmation Roll Dialog : ${value}`)
      },
    })

    game.settings.register(SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, {
      name: game.i18n.localize('GURPS.settingAllowRollBasedOnManeuver'),
      hint: game.i18n.localize('GURPS.settingHintAllowRollBasedOnManeuver'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Allow: game.i18n.localize('GURPS.allow'),
        Warn: game.i18n.localize('GURPS.warn'),
        Forbid: game.i18n.localize('GURPS.forbid'),
      },
      default: 'Warn',
      onChange: value => console.log(`Allow Roll based on Maneuver : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ALLOW_TARGETED_ROLLS, {
      name: game.i18n.localize('GURPS.settingAllowTargetedRolls'),
      hint: game.i18n.localize('GURPS.settingHintAllowTargetedRolls'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Allow: game.i18n.localize('GURPS.allow'),
        Warn: game.i18n.localize('GURPS.warn'),
        Forbid: game.i18n.localize('GURPS.forbid'),
      },
      default: 'Warn',
      onChange: value => console.log(`Allow Rolls without Target : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ALLOW_ROLLS_BEFORE_COMBAT_START, {
      name: game.i18n.localize('GURPS.settingAllowRollsBeforeCombatStart'),
      hint: game.i18n.localize('GURPS.settingHintAllowRollsBeforeCombatStart'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Allow: game.i18n.localize('GURPS.allow'),
        Warn: game.i18n.localize('GURPS.warn'),
        Forbid: game.i18n.localize('GURPS.forbid'),
      },
      default: 'Warn',
      onChange: value => console.log(`Allow Rolls before Combat is initiated : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_MAX_ACTIONS, {
      name: game.i18n.localize('GURPS.settingUseMaxActions'),
      hint: game.i18n.localize('GURPS.settingHintUseMaxActions'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Disable: game.i18n.localize('GURPS.disable'),
        AllCombatant: game.i18n.localize('GURPS.allCombatants'),
        AllTokens: game.i18n.localize('GURPS.allTokensInScene'),
      },
      default: 'allCombatant',
      onChange: value => console.log(`Use Max Actions per Token : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ALLOW_AFTER_MAX_ACTIONS, {
      name: game.i18n.localize('GURPS.settingAllowAfterMaxActions'),
      hint: game.i18n.localize('GURPS.settingHintAllowAfterMaxActions'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Allow: game.i18n.localize('GURPS.allow'),
        Warn: game.i18n.localize('GURPS.warn'),
        Forbid: game.i18n.localize('GURPS.forbid'),
      },
      default: 'Warn',
      onChange: value => console.log(`Allow Action after Max Actions : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ADD_CUMULATIVE_PARRY_PENALTIES, {
      name: game.i18n.localize('GURPS.settingAddCumulativeParryPenalties'),
      hint: game.i18n.localize('GURPS.settingHintAddCumulativeParryPenalties'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Automatically add cumulative parry penalties : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_TAGGED_MODIFIERS, {
      name: game.i18n.localize('GURPS.settingUseTaggedModifiers'),
      hint: game.i18n.localize('GURPS.settingHintUseTaggedModifiers'),
      scope: 'world',
      config: false,
      type: Object,
      default: {
        autoAdd: true,
        checkConditionals: true,
        checkReactions: true,
        useSpellCollegeAsTag: false,
        allRolls: 'all',
        allAttributesRolls: 'attribute',
        allSkillRolls: 'skill',
        allSpellRolls: 'spell',
        allDamageRolls: 'damage',
        allAttackRolls: 'hit',
        allRangedRolls: 'ranged',
        allMeleeRolls: 'melee',
        allDefenseRolls: 'defense',
        allDODGERolls: 'dodge',
        allParryRolls: 'parry',
        allBlockRolls: 'block',
        allPERRolls: 'per',
        allWILLRolls: 'will',
        allSTRolls: 'st',
        allDXRolls: 'dx',
        allIQRolls: 'iq',
        allHTRolls: 'ht',
        allFRIGHTCHECKRolls: 'fright',
        allVISIONRolls: 'vision',
        allTASTESMELLRolls: 'taste, smell',
        allHEARINGRolls: 'hearing',
        allTOUCHRolls: 'touch',
        allCRRolls: 'control',
        combatOnlyTag: 'combat',
        nonCombatOnlyTag: 'no_combat',
        combatTempTag: 'temp',
      },
      onChange: async value => {
        console.log(`Tagged Modifiers configuration : ${JSON.stringify(value)}`)
        if (value.autoAdd) {
          // Automatically set the "show-confirmation-roll-dialog" to true if autoAdd is enabled.
          game.settings.set(SYSTEM_NAME, SETTING_SHOW_CONFIRMATION_ROLL_DIALOG, true)
        }
      },
    })

    game.settings.registerMenu(SYSTEM_NAME, SETTING_USE_TAGGED_MODIFIERS, {
      name: game.i18n.localize('GURPS.settingUseTaggedModifiers'),
      label: game.i18n.localize('GURPS.settingLabelUseTaggedModifiers'),
      hint: game.i18n.localize('GURPS.settingHintUseTaggedModifiers'),
      type: TaggedModifierSettings,
      restricted: true,
    })

    game.settings.register(SYSTEM_NAME, SETTING_MODIFY_DICE_PLUS_ADDS, {
      name: game.i18n.localize('GURPS.settingModifyDicePlusAdds'),
      hint: game.i18n.localize('GURPS.settingHintModifyDicePlusAdds'),
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use Modifying Dice + Adds rule : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ADD_SHOCK_AT_TURN, {
      name: game.i18n.localize('GURPS.settingAddShockAtTurn'),
      hint: game.i18n.localize('GURPS.settingHintAddShockAtTurn'),
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Immediately: game.i18n.localize('GURPS.immediately'),
        AtNextTurn: game.i18n.localize('GURPS.atNextTurn'),
      },
      default: 'AtNextTurn',
      onChange: value => console.log(`Adding Shock at Target : ${value}`),
    })
  })
}
