import { GurpsModule } from 'module/gurps-module.js'
import { GurpsCombat, handleCombatTurnChange, resetTokenActions } from './combat.js'
import { GurpsCombatant } from './combatant.js'
import { DEFAULT_INITIATIVE_FORMULA, updateInitiativeFormula } from './initiative.ts'
import { migrate } from './migrate.js'
import { GurpsRange, setupRanges } from './ranges.js'
import {
  getInitiativeFormula,
  getManeuverDetail,
  getManeuverVisibility,
  getRangeStrategy,
  getRollBasedOnManeuverPolicy,
  isUsingOnTarget,
  maneuverUpdatesMove,
  registerCombatSettings,
  useSizeModifierDifferenceInMelee,
} from './settings.js'
import { ManeuverDetail, ManeuverVisibility, RangeStrategy, RollBasedOnManeuverPolicy } from './types.ts'

export interface GurpsCombatModule extends GurpsModule {
  getInitiativeFormula: () => string
  getManeuverDetail: () => ManeuverDetail
  getManeuverVisibility: () => ManeuverVisibility
  getRangeStrategy: () => RangeStrategy
  getRollBasedOnManeuverPolicy: () => RollBasedOnManeuverPolicy
  isUsingOnTarget: () => boolean
  maneuverUpdatesMove: () => boolean
  useSizeModifierDifferenceInMelee: () => boolean
}

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
    CONFIG.Combat.initiative = {
      formula: DEFAULT_INITIATIVE_FORMULA,
      decimals: 5, // Important to be able to maintain resolution
    }

    registerCombatSettings()
  })

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
  migrate,

  // -- Combat settings --
  getManeuverDetail,
  getManeuverVisibility,
  getRangeStrategy,
  getRollBasedOnManeuverPolicy,
  getInitiativeFormula,
  isUsingOnTarget,
  maneuverUpdatesMove,
  useSizeModifierDifferenceInMelee,
}
