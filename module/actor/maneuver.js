import { SETTING_MANEUVER_VISIBILITY, SYSTEM_NAME, SETTING_MANEUVER_DETAIL } from '../../lib/miscellaneous-settings.js'

export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_STEP = 'step'
export const MOVE_NONE = 'none'
export const MOVE_FULL = 'full'
export const MOVE_HALF = 'half'

class Maneuver {
  constructor(data) {
    this.id = data.id
    this.move = data.move
    this.defense = data.defense
    this.icon = data.icon
    this.label = data.label
  }
}

const ManeuverData = {
  do_nothing: {
    id: 'do_nothing',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverDoNothing',
    fullturn: false,
  },
  move: {
    id: 'move',
    move: MOVE_FULL,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-move.png',
    label: 'GURPS.maneuverMove',
    fullturn: false,
  },
  aim: {
    id: 'aim',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-aim.png',
    label: 'GURPS.maneuverAim',
    fullturn: true,
  },
  change_posture: {
    id: 'change_posture',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-change-posture.png',
    label: 'GURPS.maneuverChangePosture',
    fullturn: false,
  },
  evaluate: {
    id: 'evaluate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-evaluate.png',
    label: 'GURPS.maneuverEvaluate',
    fullturn: false,
  },
  attack: {
    id: 'attack',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverAttack',
    fullturn: false,
  },
  feint: {
    id: 'feint',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverFeint',
    fullturn: false,
  },
  allout_attack: {
    id: 'allout_attack',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttack',
    fullturn: false,
  },
  aoa_determined: {
    id: 'aoa_determined',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-determined.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDetermined',
    fullturn: false,
  },
  aoa_double: {
    id: 'aoa_double',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDouble',
    fullturn: false,
  },
  aoa_feint: {
    id: 'aoa_feint',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackFeint',
    fullturn: false,
  },
  aoa_strong: {
    id: 'aoa_strong',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-strong.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackStrong',
    fullturn: false,
  },
  aoa_suppress: {
    id: 'aoa_suppress',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-suppress.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
    fullturn: true,
  },
  move_and_attack: {
    id: 'move_and_attack',
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    icon: 'systems/gurps/icons/maneuvers/man-move-attack.png',
    label: 'GURPS.maneuverMoveAttack',
    fullturn: false,
  },
  allout_defense: {
    id: 'allout_defense',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefense',
    fullturn: false,
  },
  aod_dodge: {
    id: 'aod_dodge',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-dodge.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDodge',
    fullturn: false,
  },
  aod_parry: {
    id: 'aod_parry',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-parry.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseParry',
    fullturn: false,
  },
  aod_block: {
    id: 'aod_block',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-block.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseBlock',
    fullturn: false,
  },
  aod_double: {
    id: 'aod_double',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDouble',
    fullturn: false,
  },
  ready: {
    id: 'ready',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-ready.png',
    label: 'GURPS.maneuverReady',
    fullturn: false,
  },
  concentrate: {
    id: 'concentrate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-concentrate.png',
    label: 'GURPS.maneuverConcentrate',
    fullturn: true,
  },
  wait: {
    id: 'wait',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-wait.png',
    label: 'GURPS.maneuverWait',
    fullturn: false,
  },
}

export class Maneuvers {
  /**
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

  static getManeuver(maneuverText) {
    return ManeuverData[maneuverText]
  }

  static getIcon(maneuverText) {
    return this.getManeuver(maneuverText).icon
  }

  static getData() {
    return ManeuverData
  }

  static getByIcon(icon) {
    return Object.values(ManeuverData).find(it => it.icon === icon)
  }

  static getIconForPlayer(token, icon) {
    if (game.user.isGM) return icon
    if (token.isOwner) return icon

    return icon
  }
}

// Our override of the TokenHUD; it removes the maneuver tokens from the list of status effects
export class GURPSTokenHUD extends TokenHUD {
  getData(options) {
    let data = super.getData(options)
    console.log('GURPSTokenHUD')

    // edit data.statusEffects to remove maneuver icons -- statusEffects is an Object, properties are the icon path
    for (const key in data.statusEffects) {
      if (Maneuvers.isManeuverIcon(key)) {
        delete data.statusEffects[key]
      }
    }
    return data
  }
}

Hooks.once('init', () => {
  // Patch the method Token#drawEffects so we can monkey with the token effects before drawing
  const original_Token_drawEffects = Token.prototype.drawEffects
  Token.prototype.drawEffects = async function (...args) {
    const tokenEffects = this.data.effects

    // modify this.data.effects based on maneuver settings
    const visibility = game.settings.get(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY)
    if (visibility === 'NoOne') {
      this.data.effects = this.data.effects.filter(icon => !Maneuvers.isManeuverIcon(icon))
    } else if (visibility === 'GMAndOwner') {
      if (!game.user.isGM && !this.isOwner)
        this.data.effects = this.data.effects.filter(icon => !Maneuvers.isManeuverIcon(icon))
    }

    if (!game.user.isGM && !this.isOwner) {
      const detail = game.settings.get(SYSTEM_NAME, SETTING_MANEUVER_DETAIL)
      // Replace 'Feint' with 'Attack'
      if (this.data.effects.includes(ManeuverData.feint.icon) && detail !== 'Full') {
        for (let i = 0; i < this.data.effects.length; i++) {
          if (this.data.effects[i] === ManeuverData.feint.icon) this.data.effects[i] = ManeuverData.feint.alt
        }
      }
      // replace others
      if (detail === 'General') {
        for (let i = 0; i < this.data.effects.length; i++) {
          let icon = this.data.effects[i]
          if (Maneuvers.isManeuverIcon(icon)) {
            let m = Maneuvers.getByIcon(icon)
            if (m.hasOwnProperty('alt')) this.data.effects[i] = m.alt
          }
        }
      }
    }

    // call the original method
    const result = original_Token_drawEffects.apply(this, args)

    // restore the original token effects
    this.data.effects = tokenEffects

    return result
  }
})

// on create combatant, set the maneuver
Hooks.on('createCombatant', (combat, options, id) => {
  console.log(id)
  let token = combat.token
  let actor = combat.actor
  actor.updateManeuver('do_nothing', token.id)
})

// on delete combatant, remove the maneuver
Hooks.on('deleteCombatant', (combat, options, id) => {
  console.log(id)
  let token = combat.token
  let actor = combat.actor
  actor.removeManeuver(token.id)
})

Hooks.on('deleteCombat', (combat, options, id) => {
  let combatants = combat.data.combatants.contents
  combatants.forEach(it => it.actor.removeManeuver(it.token.id))
})

// TODO consider subtracting 1 FP from every combatant that leaves combat
