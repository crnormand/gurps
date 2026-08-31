import { GurpsModule } from 'module/gurps-module.js'
import { GurpsCombat } from './combat.js'
import { GurpsCombatant } from './combatant.js'
import { CombatOption, CombatOptionSection } from './combat-options.js'
import { registerCombatOptionsMenu } from './combat-options-config.js'
import { enabledCombatOptions, isManeuverInPlay, isUsingOnTarget, registerCombatSettings } from './settings.js'

export interface GurpsCombatModule extends GurpsModule {
  enabledOptions: (section: CombatOptionSection) => CombatOption[]
  isManeuverInPlay: (maneuverName: string) => boolean
  isUsingOnTarget: () => boolean
}

function init() {
  console.log('GURPS | Initializing GURPS Combat module.')
  Hooks.once('init', () => {
    CONFIG.Combat.documentClass = GurpsCombat
    CONFIG.Combatant.documentClass = GurpsCombatant
    registerCombatSettings()
    registerCombatOptionsMenu()
  })
}

export const Combat: GurpsCombatModule = {
  init,
  enabledOptions: enabledCombatOptions,
  isManeuverInPlay,
  isUsingOnTarget,
}
