import { GurpsSettingsApplication } from '@module/util/gurps-settings-application.js'

import { DEFAULT_INITIATIVE_FORMULA, updateInitiativeFormula } from './initiative.js'
import {
  ICON,
  ManeuverDetail,
  ManeuverVisibility,
  MODULE_NAME,
  RangeStrategy,
  RollBasedOnManeuverPolicy,
  SETTINGS,
} from './types.js'

export const SETTING_ALLOW_ROLL_BASED_ON_MANEUVER: any = 'combat.allow-roll-based-on-maneuver'
export const SETTING_INITIATIVE_FORMULA: any = 'combat.initiative-formula'
export const SETTING_MANEUVER_DETAIL: any = 'combat.maneuver-detail'
export const SETTING_MANEUVER_UPDATES_MOVE: any = 'combat.maneuver-updates-move'
export const SETTING_MANEUVER_VISIBILITY: any = 'combat.maneuver-visibility'
export const SETTING_RANGE_STRATEGY: any = 'combat.rangeStrategy'
export const SETTING_USE_ON_TARGET: any = 'combat.use-on-target'
export const SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE: any = 'combat.use-size-modifier-difference-in-melee'

export function initializeCombatSettings(): void {
  Hooks.once('init', () => {
    if (!game.settings) throw new Error('GURPS | Combat module requires game.settings to be available!')

    game.settings.register(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, {
      name: 'GURPS.settingCombatInitiative',
      hint: 'GURPS.settingHintCombatInitiative',
      scope: 'world',
      config: false,
      type: String,
      default: DEFAULT_INITIATIVE_FORMULA,
      onChange: value => {
        console.log(`${SETTING_INITIATIVE_FORMULA}: ${value}`)
        updateInitiativeFormula(true)
      },
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
      onChange: value => {
        console.log(`${SETTING_RANGE_STRATEGY}: ${value}`)
        GURPS.rangeObject.update()
      },
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
      onChange: value => console.log(`${SETTING_USE_ON_TARGET}: ${value}`),
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
        redrawAllTokenEffects()
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
        redrawAllTokenEffects()
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

    function redrawAllTokenEffects() {
      game.scenes?.active?.tokens.forEach(token => token.object?.drawEffects())
    }
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

export function maneuverUpdatesMove(fallback: boolean = false): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_MANEUVER_UPDATES_MOVE) || fallback
}

export function getRollBasedOnManeuverPolicy(): RollBasedOnManeuverPolicy {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_ALLOW_ROLL_BASED_ON_MANEUVER) as RollBasedOnManeuverPolicy
}

export function useSizeModifierDifferenceInMelee(fallback: boolean = false): boolean {
  return !!game.settings?.get(GURPS.SYSTEM_NAME, SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE) || fallback
}

export function getInitiativeFormula(): string {
  return game.settings?.get(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA) as string
}

export function setInitiativeFormula(value: string): void {
  game.settings?.set(GURPS.SYSTEM_NAME, SETTING_INITIATIVE_FORMULA, value)
}

export function getRangeStrategy(fallback: RangeStrategy = 'Standard'): RangeStrategy {
  return (game.settings?.get(GURPS.SYSTEM_NAME, SETTING_RANGE_STRATEGY) as RangeStrategy) || fallback
}
