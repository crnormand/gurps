'use strict'

import ModifierBucketJournals from '../module/modifier-bucket/select-journals.js'
import Initiative from './initiative.js'
import { i18n } from '../lib/utilities.js'

export const SYSTEM_NAME = 'gurps'
export const SETTING_MIGRATION_VERSION = 'migration-version'
export const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
export const SETTING_SIMPLE_DAMAGE = 'combat-simple-damage'
export const SETTING_APPLY_DIVISOR = 'combat-apply-divisor'
export const SETTING_BLUNT_TRAUMA = 'combat-blunt-trauma'
export const SETTING_LOCATION_MODIFIERS = 'combat-location-modifiers'
export const SETTING_WHISPER_STATUS_EFFECTS = 'whisper-status-effectss'
export const SETTING_CHANGELOG_VERSION = 'changelogVersion'
export const SETTING_SHOW_CHANGELOG = 'showChangelog'
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
      name: "Show 'Read Me' on version change",
      hint: "If checked, the system will display the 'Read Me' file every time a version change is detected.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show Change Log : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_RANGE_STRATEGY, {
      name: 'Options: Range modifier strategy:',
      hint: 'Sets the formula to use to calculate range penalties.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Standard: 'Size and Speed/Range Table',
        Simplified: 'Monster Hunters 2 Range Bands',
      },
      default: 'Standard',
      onChange: value => GURPS.rangeObject.update(),
    })

    // PDF Configuration ----

    // Support for combined or separate Basic Set PDFs
    game.settings.register(SYSTEM_NAME, 'basicsetpdf', {
      name: 'Basic Set PDF(s)',
      hint:
        'Select "Combined" or "Separate" and use the associated PDF codes when configuring PDFoundry. ' +
        'Note: If you select "Separate", the Basic Set Campaigns PDF should open up to page 340 during the PDFoundry test.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        Combined: 'Combined Basic Set (code "B")',
        Separate: 'Separate (Characters, "B"; Campaigns, "BX")',
      },
      default: 'Combined',
      onChange: value => console.log(`Basic Set PDFs : ${value}`),
    })

    // GCS/GCA Import Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_IGNORE_IMPORT_NAME, {
      name: "Import: Ignore 'name' attribute",
      hint:
        "If checked, the system will ignore the 'name' attribute of the Actor during imports. This is useful if the name that you use in Foundry differs from GCA/GCS and you don't want it overwritten on every import.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Ignore import name : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_HP_FP, {
      name: 'Import: Current HP and FP',
      hint: 'NOTE: Current HP and FP are always read from the file during the initial import.',
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: "Use the import file's current HP and FP.",
        1: "Ignore the import file's current HP and FP.",
        2: 'Ask before overwriting during import.',
      },
      onChange: value => console.log(`Import of Current HP and FP : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_IMPORT_BODYPLAN, {
      name: 'Import: Body Plan/Hit Locations',
      hint: 'NOTE: The Body Plan is always read from the file during the initial import.',
      scope: 'world',
      config: true,
      default: 2,
      type: Number,
      choices: {
        0: "Use the import file's Body Plan.",
        1: "Ignore the import file's Body Plan.",
        2: 'Ask before overwriting during import.',
      },
      onChange: value => console.log(`Import of Body Plan : ${value}`),
    })

    // Actor Sheet Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_SHEET_NAVIGATION, {
      name: 'Actor: Show navigation',
      hint: 'If checked, a navigation footer will be displayed on the full GCS character sheet.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show navigation footer : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_ENHANCED_INPUT, {
      name: 'Actor: Enhanced numeric inputs',
      hint:
        'If checked, certain fields (such as FP) will display add and subtract shortcut buttons when they have focus.',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Use enhanced numeric input : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ENCUMBRANCE, {
      name: 'Actor: Calculate Encumbrance',
      hint:
        'If checked, the Encumbrance level will be set automatically based on the carried equipment (and you cannot change the Encumbrance level manually).   If this is turned off, you can change the Encumbrance level by clicking on the new level.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic encumbrance : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_CHECK_EQUIPPED, {
      name: "Actor: Weight based on 'Equipped'",
      hint:
        "If checked, ONLY 'Equipped' items will be included in the weight calculation.   If unchecked, all items in the Equipment list are included in the weight calculation.   Uncheck, and the players can use the 'Equipped' flag to indicate they have dropped the item.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Check 'Equipped' items in weight calculation : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_USER_CREATED, {
      name: "Actor: Show a 'saved' icon next to user created equipment and notes.",
      hint: "If checked, a small icon will appear after user created (not imported) equipment and before user created notes",
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'saved' icon for user created items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_FOUNDRY_CREATED, {
      name: "Actor: Show an icon next to Foundry Items (and their features).",
      hint: "If checked, a small icon will appear after equipment (and features) created from Foundry Items",
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Show a 'star' icon for Foundry items : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHIFT_CLICK_BLIND, {
      name: "SHIFT Click does a Blind roll for players, and a Self roll for GMs",
      hint:
        "If not checked, holding down the SHIFT key when you are making a roll will make a Self roll (only you can see it, no matter who you are).   If checked, when players hold down the SHIFT key, it will make it a Blind Roll instead (GMs still get a Self roll)",
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`SHIFT Click does a Blind roll for players : ${value}`),
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

    // Damage calculation options ----

    game.settings.register(SYSTEM_NAME, SETTING_ONLY_GMS_OPEN_ADD, {
      name: 'Damage: Restrict ADD to GM',
      hint:
        'If checked, only GMs can view/use the Apply Damage Dialog. Players who drag and drop damage will just receive a message.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Only GMs can open ADD : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
      name: 'Damage: Simple ADD',
      hint: 'If checked, only display the "Directly Apply" option in the Apply Damage Dialog.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use simply Apply Damage dialog : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
      name: 'Damage: Default hit location',
      hint: 'Set the default hit location used to apply damage.',
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
      name: 'Damage: Armor Divisors',
      hint: "If checked, adjust the target's DR by the armor divisor on the attack.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Armor Divisor : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_BLUNT_TRAUMA, {
      name: 'Damage: Blunt Trauma',
      hint: 'If checked, use Blunt Trauma rules for calculating damage on flexible armor.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Blunt Trauma : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_LOCATION_MODIFIERS, {
      name: 'Damage: Location Wounding Modifiers',
      hint: 'If checked, modify Wounding Modifiers based on Hit Location.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Apply Location Modifiers : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_SHOW_THE_MATH, {
      name: 'Damage: Show the math',
      hint:
        "If checked, the 'SHOW THE MATH' section of the damage chat message will be expanded by default. If unchecked, you can click on the 'SHOW THE MATH' title to expand it.  NOTE: If this is the last message in the chat log, it may expand below the bottom of the log, and you might need to scroll down to see it.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
      onChange: value => console.log(`Always expand SHOW THE MATH : ${value}`),
    })

    // Status Effects Configuration ----

    game.settings.register(SYSTEM_NAME, SETTING_WHISPER_STATUS_EFFECTS, {
      name: 'Status Effects: Whisper',
      hint:
        "If checked, Status Effects messages (Shock, Major Wound, etc.) will be sent to the target's owner as a Whisper. Otherwise they will be sent as a Out of Character (OOC) message to everyone.",
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Whisper Status Effects : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_AUTOMATIC_ONETHIRD, {
      name: 'Status Effects: Auto Reeling and Tired',
      hint:
        'If checked, Reeling (1/2 move/dodge) and Tired (1/2 move/dodge/ST) will automatically be turned on when the character drops below 1/3 HP and 1/3 FP.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use automatic reeling/tired : ${value}`),
    })

    game.settings.register(SYSTEM_NAME, SETTING_PLAYER_CHAT_PRIVATE, {
      name: 'Player Chat commands private',
      hint:
        "If checked, most of the chat commands (e.g. /hp, /fp, /qty, etc.) will display as a whisper to the player (instead of an Out Of Character message).   If you trust your players, and don't like to see the chat fill up with their chat commands, turn this on",
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

    game.settings.register(SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
      name: 'Combat Initiative Formula',
      hint: `This is the formula used by Foundry to determine turn order in combat.  Warning: Only change this if you know what you are doing!   We do not parse this for correctness.
      Set this field blank to reset the formula back to the GURPS Combat Turn Sequence, B362.`,
      scope: 'world',
      config: true,
      type: String,
      default: Initiative.defaultFormula(),
      onChange: value => GURPS.setInitiativeFormula(true),
    })

    game.settings.register(SYSTEM_NAME, SETTING_USE_CONDITIONAL_INJURY, {
      name: 'Options: Conditional Injury',
      hint:
        'From Pyramid #3/120: Conditional Injury removes Hit Points from the game as the basis for wound tracking, and replaces them with an effects based method for injury.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => GURPS.ConditionalInjury.update(),
    })
  })
}
