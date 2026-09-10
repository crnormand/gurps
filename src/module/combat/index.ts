import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { GurpsCombat, handleCombatTurnChange, resetTokenActions } from './combat.js'
import { GurpsCombatant } from './combatant.js'
import { DEFAULT_INITIATIVE_FORMULA, updateInitiativeFormula } from './initiative.js'
import Maneuvers, {
  MOVE_NONE,
  MOVE_ONE,
  MOVE_STEP,
  MOVE_TWO_STEPS,
  MOVE_ONETHIRD,
  MOVE_HALF,
  MOVE_TWOTHIRDS,
  MOVE_FULL,
} from './maneuver.js'
import { migrateCombatSettings } from './migrate.js'
import { GurpsRange, setupRanges } from './ranges.js'
import {
  getInitiativeFormula,
  getManeuverDetail,
  getManeuverVisibility,
  getRangeStrategy,
  getRollBasedOnManeuverPolicy,
  initializeCombatSettings,
  isUsingOnTarget,
  maneuverUpdatesMove,
  useSizeModifierDifferenceInMelee,
} from './settings.js'
import { ManeuverDetail, ManeuverVisibility, RangeStrategy, RollBasedOnManeuverPolicy } from './types.js'

export interface GurpsCombatModule extends GurpsModule {
  getInitiativeFormula: () => string
  getManeuverDetail: () => ManeuverDetail
  getManeuverVisibility: () => ManeuverVisibility
  getRangeStrategy: (fallback: RangeStrategy) => RangeStrategy
  getRollBasedOnManeuverPolicy: (fallback: RollBasedOnManeuverPolicy) => RollBasedOnManeuverPolicy
  isUsingOnTarget: () => boolean
  maneuverUpdatesMove: (fallback: boolean) => boolean
  useSizeModifierDifferenceInMelee: () => boolean
  Movement: Record<string, string>
  Maneuvers: typeof Maneuvers
}

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')

  initializeCombatSettings()

  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
    CONFIG.Combat.initiative = {
      formula: DEFAULT_INITIATIVE_FORMULA,
      decimals: 5, // Important to be able to maintain resolution
    }
  })

  Hooks.once('ready', migrateCombatSettings)

  Hooks.once('ready', () => {
    Hooks.on('combatStart', async combat => {
      console.log(`Combat started: ${combat.id} - resetting token actions`)
      await resetTokenActions(combat)
    })

    if (game.user?.isGM) {
      Hooks.on('combatTurnChange', async (combat, previousTurn, newTurn) => {
        await handleCombatTurnChange(combat, previousTurn, newTurn)
      })
    }

    updateInitiativeFormula(true)

    // Set up SSRT
    GURPS.SSRT = setupRanges()
    GURPS.rangeObject = new GurpsRange()
  })
}

export const Combat: GurpsCombatModule = {
  init,

  // -- Combat settings --
  getManeuverDetail,
  getManeuverVisibility,
  getRangeStrategy,
  getRollBasedOnManeuverPolicy,
  getInitiativeFormula,
  isUsingOnTarget,
  maneuverUpdatesMove,
  useSizeModifierDifferenceInMelee,

  // -- Combat Movement --
  Movement: {
    none: MOVE_NONE,
    one: MOVE_ONE,
    step: MOVE_STEP,
    twoSteps: MOVE_TWO_STEPS,
    oneThird: MOVE_ONETHIRD,
    half: MOVE_HALF,
    twoThirds: MOVE_TWOTHIRDS,
    full: MOVE_FULL,
  },

  Maneuvers,
}

export const PROPERTY_MOVEOVERRIDE_MANEUVER = 'system.moveoverride.maneuver'
export const PROPERTY_MOVEOVERRIDE_POSTURE = 'system.moveoverride.posture'
