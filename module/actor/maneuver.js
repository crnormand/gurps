export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_STEP = 'step'
export const MOVE_NONE = 'none'
export const MOVE_FULL = 'full'
export const MOVE_HALF = 'half'

export const Maneuvers = {
  do_nothing: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_do_nothing.webp',
    label: 'GURPS.maneuverDoNothing',
  },
  move: {
    move: MOVE_FULL,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_move.webp',
    label: 'GURPS.maneuverMove',
  },
  aim: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_aim.webp',
    label: 'GURPS.maneuverAim',
  },
  change_posture: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_change_posture.webp',
    label: 'GURPS.maneuverChangePosture',
  },
  evaluate: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_evaluate.webp',
    label: 'GURPS.maneuverEvaluate',
  },
  attack: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_attack.webp',
    label: 'GURPS.maneuverAttack',
  },
  feint: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/attack.webp',
    label: 'GURPS.maneuverFeint',
  },
  allout_attack: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttack',
  },
  aoa_determined: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttackDetermined',
  },
  aoa_double: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttackDouble',
  },
  aoa_feint: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttackFeint',
  },
  aoa_strong: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttackStrong',
  },
  aoa_suppress: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/statuses/_allout_attack.webp',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
  },
  move_and_attack: {
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    icon: 'systems/gurps/icons/statuses/_move_attack.webp',
    label: 'GURPS.maneuverMoveAttack',
  },
  allout_defense: {
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_allout_defense.webp',
    label: 'GURPS.maneuverAllOutDefense',
  },
  aod_dodge: {
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_allout_defense.webp',
    label: 'GURPS.maneuverAllOutDefenseDodge',
  },
  aod_parry: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_allout_defense.webp',
    label: 'GURPS.maneuverAllOutDefenseParry',
  },
  aod_block: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_allout_defense.webp',
    label: 'GURPS.maneuverAllOutDefenseBlock',
  },
  aod_double: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_allout_defense.webp',
    label: 'GURPS.maneuverAllOutDefenseDouble',
  },
  ready: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_ready.webp',
    label: 'GURPS.maneuverReady',
  },
  concentrate: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_concentrate.webp',
    label: 'GURPS.maneuverConcentrate',
  },
  wait: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/statuses/_wait.webp',
    label: 'GURPS.maneuverWait',
  },
}
