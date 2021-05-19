export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_STEP = 'step'
export const MOVE_NONE = 'none'
export const MOVE_FULL = 'full'
export const MOVE_HALF = 'half'

export const Manuevers = {
  do_thing: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'statuses/_aim.png',
    label: 'GURPS.maneuverDoNothing',
  },
  move: {
    move: MOVE_FULL,
    defense: DEFENSE_ANY,
    icon: 'statuses/_move.png',
    label: 'GURPS.maneuverMove',
  },
  aim: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_aim.png',
    label: 'GURPS.maneuverAim',
  },
  change_posture: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'statuses/_change_posture.png',
    label: 'GURPS.maneuverChangePosture',
  },
  evaluate: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_evaluate.png',
    label: 'GURPS.maneuverEvaluate',
  },
  attack: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_attack.png',
    label: 'GURPS.maneuverAttack',
  },
  feint: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_feint.png',
    label: 'GURPS.maneuverFeint',
  },
  allout_attack: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttack',
  },
  aoa_determined: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttackDetermined',
  },
  aoa_double: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttackDouble',
  },
  aoa_feint: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttackFeint',
  },
  aoa_strong: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttackStrong',
  },
  aoa_suppress: {
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'statuses/_allout_attack.png',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
  },
  move_and_attack: {
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    icon: 'statuses/_move_attack.png',
    label: 'GURPS.maneuverMoveAttack',
  },
  allout_defense: {
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'statuses/_allout_defense.png',
    label: 'GURPS.maneuverAllOutDefense',
  },
  aod_dodge: {
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'statuses/_allout_defense.png',
    label: 'GURPS.maneuverAllOutDefenseDodge',
  },
  aod_parry: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_allout_defense.png',
    label: 'GURPS.maneuverAllOutDefenseParry',
  },
  aod_block: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_allout_defense.png',
    label: 'GURPS.maneuverAllOutDefenseBlock',
  },
  aod_double: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_allout_defense.png',
    label: 'GURPS.maneuverAllOutDefenseDouble',
  },
  ready: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_ready.png',
    label: 'GURPS.maneuverReady',
  },
  concentrate: {
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'statuses/_concentrate.png',
    label: 'GURPS.maneuverConcentrate',
  },
  wait: {
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'statuses/_wait.png',
    label: 'GURPS.maneuverWait',
  },
}
