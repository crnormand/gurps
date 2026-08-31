import { DEFAULT_INITIATIVE_FORMULA, updateInitiativeFormula } from './initiative.ts'
import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import {
  CombatOption,
  CombatOptionSection,
  CombatOptionSettings,
  defaultCombatOptionSettings,
  enabledOptions,
  isManeuverEnabled,
} from './combat-options.ts'
import {
  ICON,
  ManeuverDetail,
  ManeuverVisibility,
  MODULE_NAME,
  RollBasedOnManeuverPolicy,
  SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  SETTING_COMBAT_OPTIONS,
  SETTING_MANEUVER_DETAIL,
  SETTING_MANEUVER_UPDATES_MOVE,
  SETTING_USE_ON_TARGET,
  SETTING_MANEUVER_VISIBILITY,
  SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
  SETTING_INITIATIVE_FORMULA,
  SETTING_RANGE_STRATEGY,
  SETTINGS,
  RangeStrategy,
} from './types.js'

export function registerCombatSettings(): void {
  if (!game.settings) throw new Error('GURPS | Combat module requires game.settings to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
    name: 'GURPS.settingCombatInitiative',
    hint: 'GURPS.settingHintCombatInitiative',
    scope: 'world',
    config: false,
    type: String as any,
    default: DEFAULT_INITIATIVE_FORMULA,
    onChange: value => updateInitiativeFormula(true),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_RANGE_STRATEGY, {
    name: 'GURPS.settingRangeStrategy',
    hint: 'GURPS.settingHintRangeStrategy',
    scope: 'world',
    config: false,
    type: String,
    choices: {
      Standard: 'GURPS.settingRangeStrategyStandard',
      Simplified: 'GURPS.settingRangeStrategyRangeBands',
      TenPenalties: 'GURPS.settingRangeStrategyTenPenalties',
    },
    default: 'Standard',
    onChange: value => GURPS.rangeObject.update(),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE, {
    name: `${SETTINGS}.useRelativeSizeInMelee`,
    hint: `${SETTINGS}.useRelativeSizeInMeleeHint`,
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => console.log(`${SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET, {
    name: `${SETTINGS}.maneuver.useOnTarget`,
    hint: `${SETTINGS}.maneuver.useOnTargetHint`,
    scope: 'world',
    config: false,
    type: Boolean,
    default: false,
    onChange: value => {
      console.log(`${SETTING_USE_ON_TARGET}: ${value}`)
      // On Target adds and removes maneuvers, so it has the same reach as the Combat Options dialog
      // it can also be changed from.
      refreshCombatOptionUI()
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY, {
    name: `${SETTINGS}.maneuver.visibility`,
    hint: `${SETTINGS}.maneuver.visibilityHint`,
    scope: 'world',
    config: false,
    type: String,
    choices: {
      NoOne: `${SETTINGS}.maneuver.values.noOne`,
      GMAndOwner: `${SETTINGS}.maneuver.values.gmAndOwner`,
      Everyone: `${SETTINGS}.maneuver.values.everyone`,
    },
    default: 'NoOne',
    onChange: value => {
      console.log(`${SETTING_MANEUVER_VISIBILITY}: ${value}`)
      // Re-draw token effects immediately
      game.scenes?.active?.tokens.forEach(token => token.object?.drawEffects())
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_DETAIL, {
    name: `${SETTINGS}.maneuver.detail`,
    hint: `${SETTINGS}.maneuver.detailHint`,
    scope: 'world',
    config: false,
    type: String,
    choices: {
      Full: `${SETTINGS}.maneuver.values.full`,
      General: `${SETTINGS}.maneuver.values.general`,
      NoFeint: `${SETTINGS}.maneuver.values.noFeint`,
    },
    default: 'General',
    onChange: value => {
      console.log(`${SETTING_MANEUVER_DETAIL}: ${value}`)
      // Re-draw token effects immediately
      game.scenes?.active?.tokens.forEach(token => token.object?.drawEffects())
    },
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE, {
    name: `${SETTINGS}.maneuver.updatesMove`,
    hint: `${SETTINGS}.maneuver.updatesMoveHint`,
    scope: 'world',
    config: false,
    type: Boolean,
    default: true,
    onChange: value => console.log(`${SETTING_MANEUVER_UPDATES_MOVE}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, {
    name: `${SETTINGS}.maneuver.allowRoll`,
    hint: `${SETTINGS}.maneuver.allowRollHint`,
    scope: 'world',
    config: false,
    type: String,
    choices: {
      Allow: `${SETTINGS}.maneuver.values.allow`,
      Warn: `${SETTINGS}.maneuver.values.warn`,
      Forbid: `${SETTINGS}.maneuver.values.forbid`,
    },
    default: 'Warn',
    onChange: value => console.log(`${SETTING_ALLOW_ROLL_BASED_ON_MANEUVER}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS, {
    name: 'GURPS.settingCombatOptions',
    hint: 'GURPS.settingHintCombatOptions',
    scope: 'world',
    config: false,
    type: Object as any,
    default: defaultCombatOptionSettings(),
    onChange: value => {
      console.log(`Combat options: ${JSON.stringify(value)}`)
      refreshCombatOptionUI()
    },
  })

  class CombatSettingsApplication extends GurpsSettingsApplication {
    constructor(options?: any) {
      super({ title: game.i18n!.localize(`${SETTINGS}.title`), module: MODULE_NAME, icon: ICON }, options)
    }
  }

  game.settings.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: `${SETTINGS}.title`,
    label: `${SETTINGS}.title`,
    hint: `${SETTINGS}.hint`,
    icon: ICON,
    type: CombatSettingsApplication,
    restricted: true,
  })
}

/* ---------------------------------------- */
/*  Settings accessors -- use the ones exposed in this module (index.ts) for reading settings. */
/* ---------------------------------------- */

export function getCombatOptionSettings(): CombatOptionSettings {
  return (game.settings?.get(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS) ?? {}) as CombatOptionSettings
}

export function isUsingOnTarget(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET)
}

/** The options the Modifier Bucket should show in one of its sections, in registry order. */
export function enabledCombatOptions(section: CombatOptionSection): CombatOption[] {
  return enabledOptions(section, getCombatOptionSettings(), { useOnTarget: isUsingOnTarget() })
}

/** Whether a maneuver is one the GM has left in play. */
export function isManeuverInPlay(maneuverName: string): boolean {
  return isManeuverEnabled(maneuverName, getCombatOptionSettings())
}

export function getManeuverVisibility(): ManeuverVisibility {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY) as ManeuverVisibility
}

export function getManeuverDetail(): ManeuverDetail {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_DETAIL) as ManeuverDetail
}

export function maneuverUpdatesMove(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE)
}

export function getRollBasedOnManeuverPolicy(): RollBasedOnManeuverPolicy {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER) as RollBasedOnManeuverPolicy
}

export function useSizeModifierDifferenceInMelee(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE)
}

export function getInitiativeFormula(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA) as string
}

export function setInitiativeFormula(value: string): Promise<String> | undefined {
  return game.settings?.set(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, value)
}

export function getRangeStrategy(): RangeStrategy {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_RANGE_STRATEGY) as RangeStrategy
}

/**
 * The Modifier Bucket reads the combat options lazily, but it may already be open, and the combat
 * tracker menu, the token HUD palette and the sheet dropdowns are each built once per render -- so
 * anything already on screen has to be re-rendered when what is in play changes.
 */
function refreshCombatOptionUI(): void {
  GURPS.ModifierBucket?.refresh()
  ui.combat?.render()
  if (canvas?.tokens?.hud?.rendered) canvas.tokens.hud.render()
  for (const sheet of renderedActorSheets()) sheet.render()
}

/**
 * The actor sheets currently on screen.
 *
 * Reads `_sheet` rather than `sheet`, because `sheet` is a lazy getter that *constructs and caches*
 * an Application for any actor that hasn't got one -- asking every actor in the world whether its
 * sheet is open would be what opened them.
 */
export function renderedActorSheets(): any[] {
  // `game.actors` misses the synthetic actors behind unlinked tokens -- the usual case for mooks --
  // so an open mook sheet would keep offering maneuvers that are no longer in play.
  const actors = new Set([...(game.actors ?? []), ...(canvas?.tokens?.placeables ?? []).flatMap(t => t.actor ?? [])])
  return [...actors].map(actor => (actor as any)._sheet).filter(sheet => sheet?.rendered)
}

/* ---------------------------------------- */
