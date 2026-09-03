import { DEFAULT_INITIATIVE_FORMULA, updateInitiativeFormula } from './initiative.ts'
import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import {
  ICON,
  ManeuverDetail,
  ManeuverVisibility,
  MODULE_NAME,
  RollBasedOnManeuverPolicy,
  SETTING_ALLOW_ROLL_BASED_ON_MANEUVER,
  SETTING_MANEUVER_DETAIL,
  SETTING_MANEUVER_UPDATES_MOVE,
  SETTING_USE_ON_TARGET,
  SETTING_MANEUVER_VISIBILITY,
  SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE,
  SETTING_INITIATIVE_FORMULA,
  SETTING_RANGE_STRATEGY,
  SETTINGS,
  RangeStrategy,
} from './types.ts'

export function registerCombatSettings(): void {
  if (!game.settings) throw new Error('GURPS | Combat module requires game.settings to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
    name: 'GURPS.settingCombatInitiative',
    hint: 'GURPS.settingHintCombatInitiative',
    scope: 'world',
    requiresReload: true,
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
    type: String as any,
    choices: {
      Full: `${SETTINGS}.maneuver.values.fullDetail`,
      NoFeint: `${SETTINGS}.maneuver.values.noFeint`,
      General: `${SETTINGS}.maneuver.values.general`,
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
    type: Boolean as any,
    default: true,
    onChange: value => console.log(`${SETTING_MANEUVER_UPDATES_MOVE}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER, {
    name: `${SETTINGS}.maneuver.allowRoll`,
    hint: `${SETTINGS}.maneuver.allowRollHint`,
    scope: 'world',
    config: false,
    type: String as any,
    choices: {
      Allow: `${SETTINGS}.maneuver.values.allow`,
      Warn: `${SETTINGS}.maneuver.values.warn`,
      Forbid: `${SETTINGS}.maneuver.values.forbid`,
    },
    default: 'Warn',
    onChange: value => console.log(`${SETTING_ALLOW_ROLL_BASED_ON_MANEUVER}: ${value}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET, {
    name: `${SETTINGS}.maneuver.useOnTarget`,
    hint: `${SETTINGS}.maneuver.useOnTargetHint`,
    scope: 'world',
    config: false,
    type: Boolean as any,
    default: false,
    onChange: value => console.log(`${SETTING_USE_ON_TARGET}: ${value}`),
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
export function isUsingOnTarget(): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET)
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
