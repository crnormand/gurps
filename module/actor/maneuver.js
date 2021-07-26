import { SETTING_MANEUVER_VISIBILITY, SYSTEM_NAME, SETTING_MANEUVER_DETAIL } from '../../lib/miscellaneous-settings.js'
import { GurpsActor } from '../actor.js'

export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_STEP = 'step'
export const MOVE_NONE = 'none'
export const MOVE_FULL = 'full'
export const MOVE_HALF = 'half'

/**
 * @typedef {{id: string, icon: string, label: string}} StatusEffect
 * @typedef {{ move: string, defense: string, fullturn: Boolean, alt?: string}} ManeuverEffect
 * @typedef {StatusEffect & ManeuverEffect} ManeuverData
 */

const _data = {
  /** @type {ManeuverData} */
  do_nothing: {
    id: 'do_nothing',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-nothing.png',
    label: 'GURPS.maneuverDoNothing',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  move: {
    id: 'move',
    move: MOVE_FULL,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-move.png',
    label: 'GURPS.maneuverMove',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aim: {
    id: 'aim',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-aim.png',
    label: 'GURPS.maneuverAim',
    fullturn: true,
  },
  /** @type {ManeuverData} */
  change_posture: {
    id: 'change_posture',
    move: MOVE_NONE,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-change-posture.png',
    label: 'GURPS.maneuverChangePosture',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  evaluate: {
    id: 'evaluate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-evaluate.png',
    label: 'GURPS.maneuverEvaluate',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  attack: {
    id: 'attack',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverAttack',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  feint: {
    id: 'feint',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-attack.png',
    label: 'GURPS.maneuverFeint',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  allout_attack: {
    id: 'allout_attack',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttack',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aoa_determined: {
    id: 'aoa_determined',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-determined.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDetermined',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aoa_double: {
    id: 'aoa_double',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackDouble',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aoa_feint: {
    id: 'aoa_feint',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-feint.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackFeint',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aoa_strong: {
    id: 'aoa_strong',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-strong.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackStrong',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aoa_suppress: {
    id: 'aoa_suppress',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    icon: 'systems/gurps/icons/maneuvers/man-aoa-suppress.png',
    alt: 'systems/gurps/icons/maneuvers/man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
    fullturn: true,
  },
  /** @type {ManeuverData} */
  move_and_attack: {
    id: 'move_and_attack',
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    icon: 'systems/gurps/icons/maneuvers/man-move-attack.png',
    label: 'GURPS.maneuverMoveAttack',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  allout_defense: {
    id: 'allout_defense',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefense',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aod_dodge: {
    id: 'aod_dodge',
    move: MOVE_HALF,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-dodge.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDodge',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aod_parry: {
    id: 'aod_parry',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-parry.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseParry',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aod_block: {
    id: 'aod_block',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-block.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseBlock',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  aod_double: {
    id: 'aod_double',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-def-double.png',
    alt: 'systems/gurps/icons/maneuvers/man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDouble',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  ready: {
    id: 'ready',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-ready.png',
    label: 'GURPS.maneuverReady',
    fullturn: false,
  },
  /** @type {ManeuverData} */
  concentrate: {
    id: 'concentrate',
    move: MOVE_STEP,
    defense: DEFENSE_ANY,
    icon: 'systems/gurps/icons/maneuvers/man-concentrate.png',
    label: 'GURPS.maneuverConcentrate',
    fullturn: true,
  },
  /** @type {ManeuverData} */
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
   * @param {string} id
   * @returns {ManeuverData}
   */
  static get(id) {
    // @ts-ignore
    return _data[id]
  }
  /**
   * @param {string} text
   * @returns {boolean} true if the text represents a maneuver icon path.
   * @memberof Maneuvers
   */
  static isManeuverIcon(text) {
    return Object.values(_data)
      .map(m => m.icon)
      .includes(text)
  }

  /**
   * Return the sublist that are Maneuver icon paths.
   * @param {string[]} list of icon pathnames
   * @returns {string[]} the pathnames that represent Maneuvers
   * @memberof Maneuvers
   */
  static getManeuverIcons(list) {
    return list.filter(it => Maneuvers.isManeuverIcon(it))
  }

  /**
   * @param {string} maneuverText
   * @returns {ManeuverData}
   */
  static getManeuver(maneuverText) {
    // @ts-ignore
    return _data[maneuverText]
  }

  /**
   * @param {string} maneuverText
   * @returns {string}
   */
  static getIcon(maneuverText) {
    return this.getManeuver(maneuverText).icon
  }

  static getData() {
    return _data
  }

  /**
   * @param {string} icon
   * @returns {ManeuverData|undefined}
   */
  static getByIcon(icon) {
    return Object.values(_data).find(it => it.icon === icon)
  }

  /**
   * @param {ActiveEffect} activeEffect
   * @returns {boolean}
   */
  static isActiveEffectManeuver(activeEffect) {
    let id = /** @type {string} */ (activeEffect.getFlag('core', 'statusId'))
    console.log(id)
    // @ts-ignore
    return Object.getOwnPropertyNames(_data).includes(id)
  }

  /**
   * @param {ActiveEffect[]|undefined} effects
   * @return {ActiveEffect[]} just the ActiveEffects that are also Maneuvers
   */
  static getActiveEffectManeuvers(effects) {
    return effects ? effects.filter(it => Maneuvers.isActiveEffectManeuver(it)) : []
  }
}

// Our override of the TokenHUD; it removes the maneuver tokens from the list of status effects
export class GURPSTokenHUD extends TokenHUD {
  /**
   * @param {Application.RenderOptions | undefined} [options]
   */
  getData(options) {
    let data = super.getData(options)

    // edit data.statusEffects to remove maneuver icons -- statusEffects is an Object, properties are the icon path
    for (const key in data.statusEffects) {
      if (Maneuvers.isManeuverIcon(key)) {
        delete data.statusEffects[key]
      }
    }
    return data
  }
}

class GurpsToken extends Token {
  /**
   * @override
   */
  async drawEffects() {
    // get only the Maneuvers
    const effects = Maneuvers.getActiveEffectManeuvers(this.actor?.temporaryEffects) || []

    if (effects) {
      const visibility = _game().settings.get(SYSTEM_NAME, SETTING_MANEUVER_VISIBILITY)

      if (visibility === 'NoOne') {
        effects.forEach(it => (it.data.icon = null))
      } else if (visibility === 'GMAndOwner') {
        if (!_game().user?.isGM && !this.isOwner) effects.forEach(it => (it.data.icon = null))
      } else {
        // visibility === 'Everyone'
        if (!_game().user?.isGM && !this.isOwner) {
          const detail = _game().settings.get(SYSTEM_NAME, SETTING_MANEUVER_DETAIL)

          // Replace 'Feint' with 'Attack'
          if (detail !== 'Full') {
            effects
              .filter(it => 'feint' === /** @type {string} */ (it.getFlag('core', 'statusId')))
              // @ts-ignore
              .forEach(it => (it.data.icon = it.data.alt))
          }

          // replace others
          // @ts-ignore
          if (detail === 'General') effects.forEach(it => (it.data.icon = it.data.alt))
        }
      }
    } // tokenEffects

    // call the original method
    const result = super.drawEffects()

    // restore the original token effects
    // @ts-ignore
    effects.forEach(it => (it.data.icon = it.data._icon))

    return result
  }
}

Hooks.once('init', () => {
  CONFIG.Token.objectClass = GurpsToken

  // Override Actor.temporaryEffects getter to sort maneuvers to the front of the array
  Object.defineProperty(Actor.prototype, 'temporaryEffects', {
    get: function () {
      // get all active temporary effects
      let results = this.effects.filter(e => e.isTemporary && !e.data.disabled)

      if (!!results && results.length > 1) {
        // get the active temporary effects that are also maneuvers
        const effects = Maneuvers.getActiveEffectManeuvers(results)
        if (!!effects && effects.length > 0) {
          let remaining = results.filter(it => !effects.includes(it))
          results = [...effects, ...remaining]
        }
      }
      return results
    },
  })
})

// on create combatant, set the maneuver
Hooks.on('createCombatant', (/** @type {Combatant} */ combat, /** @type {any} */ _options, /** @type {any} */ id) => {
  console.log(id)
  let token = combat.token
  let actor = /** @type {GurpsActor} */ (combat.actor)
  if (!!actor && !!token && token.id) actor.updateManeuver('do_nothing', token.id)
})

// on delete combatant, remove the maneuver
Hooks.on('deleteCombatant', (/** @type {Combatant} */ combat, /** @type {any} */ _options, /** @type {any} */ id) => {
  console.log(id)
  let token = combat.token
  let actor = /** @type {GurpsActor} */ (combat.actor)
  if (!!actor && !!token && token.id) actor.removeManeuver(token.id)
})

Hooks.on('deleteCombat', (/** @type {Combat} */ combat, /** @type {any} */ _options, /** @type {any} */ _id) => {
  let combatants = combat.data.combatants.contents
  combatants.forEach(
    it => it.actor instanceof GurpsActor && it.token && it.token.id && it.actor.removeManeuver(it.token.id)
  )
})

// TODO consider subtracting 1 FP from every combatant that leaves combat

// -- Functions to get type-safe global references (for TS) --

function _game() {
  if (game instanceof Game) return game
  throw new Error('game is not initialized yet!')
}
