import { isUsingOnTarget } from './settings.js'

export const MANEUVER = 'maneuver'
export const DEFENSE_ANY = 'any'
export const DEFENSE_NONE = 'none'
export const DEFENSE_DODGEBLOCK = 'dodge-block'

export const MOVE_NONE = 'none'
export const MOVE_ONE = '1'
export const MOVE_STEP = 'step'
export const MOVE_TWO_STEPS = 'two-steps'
export const MOVE_ONETHIRD = '×1/3'
export const MOVE_HALF = 'half'
export const MOVE_TWOTHIRDS = '×2/3'
export const MOVE_FULL = 'full'

export const PROPERTY_MOVEOVERRIDE_MANEUVER = 'system.moveoverride.maneuver'
export const PROPERTY_MOVEOVERRIDE_POSTURE = 'system.moveoverride.posture'

const MANEUVER_INTRODUCED_BY_ON_TARGET = 'on-target'

const MANEUVER_NAME_AIM = 'aim'

/**
 * @typedef {{id: string, flags: { gurps: { name: string, move?: string, defense?: string, fullturn?: Boolean, img: string, altImg?: string|null} } }} ManeuverEffect
 * @typedef {import('@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData').ActiveEffectDataConstructorData & ManeuverEffect} ManeuverData
 */

/** @typedef {{name: string, label: string, move?: string, defense?: string, fullturn?: boolean, img: string, altImg?: string|null, introducedBy?: string|null}} _data */

/**
 * The purpose of this class is to help generate data that can be used in an ActiveEffect.
 */
class Maneuver {
  static filepath = 'systems/gurps/icons/maneuvers/'
  /**
   * @param {_data} data
   */
  constructor(data) {
    data.move = data.move || MOVE_STEP
    data.defense = data.defense || DEFENSE_ANY
    data.fullturn = !!data.fullturn
    data.img = Maneuver.filepath + data.img
    data.altImg = !!data.altImg ? Maneuver.filepath + data.altImg : null
    data.introducedBy = data.introducedBy ?? null
    this._data = data
  }

  /**
   * Based on the world settings, return the maneuver's image or its alternate image if the world settings say to use alternate images.
   * @returns {string}
   * */
  get img() {
    return this._data.img
  }

  get move() {
    return this._data.move
  }

  /** @returns {ManeuverData} */
  get data() {
    return {
      id: MANEUVER,
      label: this._data.label,
      img: this._data.img,
      showIcon: 2,
      flags: {
        gurps: {
          name: this._data.name,
          move: this._data.move,
          defense: this._data.defense,
          fullturn: this._data.fullturn,
          img: this._data.img,
          altImg: this._data.altImg,
          altLabel: this._data.altLabel,
          statusId: MANEUVER,
        },
      },
      statuses: [MANEUVER],
      changes: this.changes,
    }
  }

  /** @returns {import('@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData').EffectChangeDataConstructorData[]} */
  get changes() {
    let changes = []

    changes.push({
      key: 'system.conditions.maneuver',
      value: this._data.name,
      type: 'override',
    })

    changes.push({
      key: PROPERTY_MOVEOVERRIDE_MANEUVER,
      value: this.move,
      type: 'override',
    })

    return changes
  }

  get introducedBy() {
    return this._data.introducedBy
  }

  get name() {
    return this._data.name
  }
}

const maneuverDataAim = {
  name: MANEUVER_NAME_AIM,
  fullturn: true,
  img: 'man-aim.png',
  label: 'GURPS.maneuverAim',
}

// On Target changes allowed move for the Aim maneuver from step to half move (with caveats we don't model here)
const maneuverDataAimWithOnTarget = { ...maneuverDataAim, move: MOVE_HALF }

const maneuvers = {
  do_nothing: new Maneuver({
    name: 'do_nothing',
    label: 'GURPS.maneuverDoNothing',
    img: 'man-nothing.png',
    move: MOVE_NONE,
  }),
  move: new Maneuver({
    name: 'move',
    label: 'GURPS.maneuverMove',
    img: 'man-move.png',
    move: MOVE_FULL,
  }),
  aim: new Maneuver({ ...maneuverDataAim }),
  committed_aim: new Maneuver({
    name: 'committed_aim',
    label: 'GURPS.maneuverCommittedAim',
    img: 'man-aim.png',
    fullturn: true,
    move: MOVE_TWO_STEPS,
    introducedBy: MANEUVER_INTRODUCED_BY_ON_TARGET,
  }),
  allout_aim: new Maneuver({
    name: 'allout_aim',
    label: 'GURPS.maneuverAllOutAim',
    img: 'man-aim.png',
    fullturn: true,
    move: MOVE_NONE,
    defense: DEFENSE_NONE,
    introducedBy: MANEUVER_INTRODUCED_BY_ON_TARGET,
  }),
  change_posture: new Maneuver({
    name: 'change_posture',
    move: MOVE_NONE,
    img: 'man-change-posture.png',
    label: 'GURPS.maneuverChangePosture',
  }),
  evaluate: new Maneuver({
    name: 'evaluate',
    img: 'man-evaluate.png',
    label: 'GURPS.maneuverEvaluate',
  }),
  attack: new Maneuver({
    name: 'attack',
    img: 'man-attack.png',
    label: 'GURPS.maneuverAttack',
  }),
  feint: new Maneuver({
    name: 'feint',
    img: 'man-feint.png',
    label: 'GURPS.maneuverFeint',
    altImg: 'man-attack.png',
    altLabel: 'GURPS.maneuverAttack',
  }),
  committed_attack_ranged: new Maneuver({
    name: 'committed_attack_ranged',
    move: MOVE_TWO_STEPS,
    img: 'man-aoa-suppress.png',
    label: 'GURPS.maneuverCommittedAttackRanged',
    altImg: 'man-allout-attack.png',
    altLabel: 'GURPS.maneuverAllOutAttack',
    introducedBy: MANEUVER_INTRODUCED_BY_ON_TARGET,
  }),
  allout_attack: new Maneuver({
    name: 'allout_attack',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    img: 'man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_determined: new Maneuver({
    name: 'aoa_determined',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    img: 'man-aoa-determined.png',
    label: 'GURPS.maneuverAllOutAttackDetermined',
    altImg: 'man-allout-attack.png',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_ranged: new Maneuver({
    name: 'aoa_ranged',
    move: MOVE_NONE,
    defense: DEFENSE_NONE,
    img: 'man-aoa-suppress.png',
    altImg: 'man-allout-attack.png',
    label: 'GURPS.maneuverAllOutAttackRanged',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_double: new Maneuver({
    name: 'aoa_double',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    img: 'man-aoa-double.png',
    label: 'GURPS.maneuverAllOutAttackDouble',
    altImg: 'man-allout-attack.png',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_feint: new Maneuver({
    name: 'aoa_feint',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    img: 'man-aoa-feint.png',
    label: 'GURPS.maneuverAllOutAttackFeint',
    altImg: 'man-allout-attack.png',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_strong: new Maneuver({
    name: 'aoa_strong',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    altImg: 'man-allout-attack.png',
    img: 'man-aoa-strong.png',
    label: 'GURPS.maneuverAllOutAttackStrong',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  aoa_suppress: new Maneuver({
    name: 'aoa_suppress',
    move: MOVE_HALF,
    defense: DEFENSE_NONE,
    altImg: 'man-allout-attack.png',
    img: 'man-aoa-suppress.png',
    label: 'GURPS.maneuverAllOutAttackSuppressFire',
    altLabel: 'GURPS.maneuverAllOutAttack',
  }),
  move_and_attack: new Maneuver({
    name: 'move_and_attack',
    move: MOVE_FULL,
    defense: DEFENSE_DODGEBLOCK,
    img: 'man-move-attack.png',
    label: 'GURPS.maneuverMoveAttack',
  }),
  allout_defense: new Maneuver({
    name: 'allout_defense',
    move: MOVE_HALF,
    img: 'man-defense.png',
    label: 'GURPS.maneuverAllOutDefense',
  }),
  aod_dodge: new Maneuver({
    name: 'aod_dodge',
    move: MOVE_HALF,
    altImg: 'man-defense.png',
    img: 'man-def-dodge.png',
    label: 'GURPS.maneuverAllOutDefenseDodge',
    altLabel: 'GURPS.maneuverAllOutDefense',
  }),
  aod_parry: new Maneuver({
    name: 'aod_parry',
    altImg: 'man-defense.png',
    img: 'man-def-parry.png',
    label: 'GURPS.maneuverAllOutDefenseParry',
    altLabel: 'GURPS.maneuverAllOutDefense',
  }),
  aod_block: new Maneuver({
    name: 'aod_block',
    altImg: 'man-defense.png',
    img: 'man-def-block.png',
    label: 'GURPS.maneuverAllOutDefenseBlock',
    altLabel: 'GURPS.maneuverAllOutDefense',
  }),
  aod_double: new Maneuver({
    name: 'aod_double',
    altImg: 'man-defense.png',
    img: 'man-def-double.png',
    img: 'man-defense.png',
    label: 'GURPS.maneuverAllOutDefenseDouble',
    altLabel: 'GURPS.maneuverAllOutDefense',
  }),
  ready: new Maneuver({
    name: 'ready',
    img: 'man-ready.png',
    label: 'GURPS.maneuverReady',
  }),
  concentrate: new Maneuver({
    name: 'concentrate',
    fullturn: true,
    img: 'man-concentrate.png',
    label: 'GURPS.maneuverConcentrate',
  }),
  wait: new Maneuver({
    name: 'wait',
    move: MOVE_NONE,
    img: 'man-wait.png',
    label: 'GURPS.maneuverWait',
  }),
}

const filterManeuvers = (introducedBy = []) => {
  const result = {}

  for (const key in maneuvers) {
    let maneuver = maneuvers[key]

    // Aim maneuver has different data with On Target than without
    if (introducedBy.includes(MANEUVER_INTRODUCED_BY_ON_TARGET) && maneuver.name === MANEUVER_NAME_AIM) {
      maneuver = new Maneuver({ ...maneuverDataAimWithOnTarget })
    }

    if (!maneuver.introducedBy || introducedBy.includes(maneuver.introducedBy)) {
      result[key] = maneuver
    }
  }

  return result
}

/**
 * The maneuvers from the source books this world has switched on. On Target both adds maneuvers and
 * gives Aim a different allowed move, so a maneuver id already stored on a token has to be resolved
 * against this rather than against the registry.
 */
const fromSourcesInUse = () => filterManeuvers(isUsingOnTarget() ? [MANEUVER_INTRODUCED_BY_ON_TARGET] : [])

export default class Maneuvers {
  /**
   * @param {string} id
   * @returns {ManeuverData}
   */
  static get(id) {
    return fromSourcesInUse()[id]?.data
  }

  /**
   * @param {string} text
   * @returns {boolean} true if the text represents a maneuver img path.
   * @memberof Maneuvers
   */
  static isManeuverIcon(text) {
    return Object.values(fromSourcesInUse())
      .map(m => m.img)
      .includes(text)
  }

  /**
   * Return the sublist that are Maneuver img paths.
   * @param {string[]} list of img pathnames
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
  static getManeuver(maneuverText = 'do_nothing') {
    if (maneuverText === 'undefined') maneuverText = 'do_nothing'
    return fromSourcesInUse()[maneuverText].data
  }

  /**
   * @param {string} maneuverText
   * @returns {string|null}
   */
  static getIcon(maneuverText) {
    return Maneuvers.getManeuver(maneuverText).img ?? null
  }

  /**
   * Every maneuver in the system, in canonical (B364) order, whether or not this world uses the
   * source book that introduced it.
   *
   * Aim appears once, with its Basic Set data -- the On Target variant only exists in a world using
   * that book, so it is not part of "every maneuver".
   */
  static getAll() {
    return { ...maneuvers }
  }

  /**
   * The maneuvers a user may pick from. Anything offering a maneuver to a human -- a sheet dropdown,
   * the token HUD palette, the combat tracker menu, `/man` -- reads this.
   *
   * Kept separate from the resolution accessors above: a maneuver already applied to a token still
   * has to resolve its icon, label and move whether or not it may still be picked.
   */
  static getAllInPlay() {
    return fromSourcesInUse()
  }

  static getAllInPlayData() {
    let data = {}
    for (const [key, maneuver] of Object.entries(Maneuvers.getAllInPlay())) {
      data[key] = maneuver.data
    }

    return data
  }

  /**
   * @param {string} img
   * @returns {ManeuverData[]|undefined}
   */
  static getByIcon(img) {
    return Object.values(fromSourcesInUse())
      .filter(it => it.img === img)
      .map(it => it.data)
  }

  /**
   * The ActiveEffect is a Maneuver if its statusId is 'maneuver'.
   * @param {ActiveEffect} activeEffect
   * @returns {boolean}
   */
  static isActiveEffectManeuver(activeEffect) {
    return activeEffect.statuses.find(s => s === 'maneuver')
  }

  /**
   * @param {ActiveEffect.Implementation[]|undefined} effects
   * @return {ActiveEffect.Implementation[]} just the ActiveEffects that are also Maneuvers
   */
  static getActiveEffectManeuvers(effects) {
    return effects ? effects.filter(it => Maneuvers.isActiveEffectManeuver(it)) : []
  }
}

// TODO consider subtracting 1 FP from every combatant that leaves combat
