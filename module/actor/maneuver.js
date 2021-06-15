export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_STEP = 'step'
export const MOVE_NONE = 'none'
export const MOVE_FULL = 'full'
export const MOVE_HALF = 'half'

export const ManeuverData = {
  do_nothing: {
    id: 'do_nothing',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverDoNothing',
  },
  move: {
    id: 'move',
    move: MOVE_FULL,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-move.png',
    label: 'GURPS.maneuverMove',
  },
  aim: {
    id: 'aim',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-aim.png',
    label: 'GURPS.maneuverAim',
  },
  change_posture: {
    id: 'change_posture',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-change-posture.png',
    label: 'GURPS.maneuverChangePosture',
  },
  evaluate: {
    id: 'evaluate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-evaluate.png',
    alt: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverEvaluate',
  },
  attack: {
    id: 'attack',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverAttack',
  },
  feint: {
    id: 'feint',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverFeint',
  },
  allout_attack: {
    id: 'allout_attack',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttack',
  },
  aoa_determined: {
    id: 'aoa_determined',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-determined.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDetermined',
  },
  aoa_double: {
    id: 'aoa_double',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDouble',
  },
  aoa_feint: {
    id: 'aoa_feint',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackFeint',
  },
  aoa_strong: {
    id: 'aoa_strong',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-strong.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackStrong',
  },
  aoa_suppress: {
    id: 'aoa_suppress',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-suppress.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
  },
  move_and_attack: {
    id: 'move_and_attack',
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    icon: 'systems/gurps/icons/maneuvers/man-move-attack.png',
    label: 'GURPS.maneuverMoveAttack',
  },
  allout_defense: {
    id: 'allout_defense',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefense',
  },
  aod_dodge: {
    id: 'aod_dodge',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-dodge.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDodge',
  },
  aod_parry: {
    id: 'aod_parry',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-parry.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseParry',
  },
  aod_block: {
    id: 'aod_block',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-block.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseBlock',
  },
  aod_double: {
    id: 'aod_double',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDouble',
  },
  ready: {
    id: 'ready',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-ready.png',
    label: 'GURPS.maneuverReady',
  },
  concentrate: {
    id: 'concentrate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-concentrate.png',
    alt: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverConcentrate',
  },
  wait: {
    id: 'wait',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-wait.png',
    alt: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverWait',
  },
}

export class Maneuvers {
  /**
   * Return true if the text represents a maneuver icon path.
   * @param {String} text
   * @returns true if the text represents a maneuver icon path.
   * @memberof Maneuvers
   */
  static isManeuverIcon(text) {
    return Object.values(ManeuverData)
      .map(m => m.icon)
      .includes(text)
  }

  /**
   * Return the sublist that are Maneuver icon paths.
   * @param {Array<String>} list of icon pathnames
   * @returns Array<String> the pathnames that represent Maneuvers
   * @memberof Maneuvers
   */
  static getManeuverIcons(list) {
    return list.filter(it => Maneuvers.isManeuverIcon(it))
  }

  static getIcon(maneuverText) {
    return ManeuverData[maneuverText].icon
  }

  static getData() {
    return ManeuverData
  }
}
