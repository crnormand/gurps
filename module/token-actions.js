import { i18n, recurselist } from '../lib/utilities.js'
import Maneuvers from './actor/maneuver.js'

/**
 * # Actor Actions Class
 *
 * This class handles and represents the available actions
 * for an actor's token, as per GURPS rules below:
 *
 * ### Number of Turns available per second (or Foundry Turn)
 * * 1 Turn per second + Altered Time Rate (ATR) Levels
 *
 * ### Choice Maneuver
 * * 1 maneuver per turn
 *
 * ### Attacks per turn
 * * 1 attack + Extra Attacks, modified per Maneuver or Effect
 *
 * ### Defenses per Turn
 * * Dodge: Unlimited, modified per Maneuver or Effect.
 * * Parry: 1 per turn, subsequent parries at -4, modified per Maneuver or Effect.
 * * Block: 1 per turn, modified per Maneuver or Effect.
 *
 * ### Movement per Turn
 * * Current Actor Basic Move, modified per Maneuver or Effect
 *
 * ### Concentrate per turn
 * * +1, modified per Maneuver or Effect
 *
 * ### Evaluate
 * * +1, modified per Maneuver or Effect, max: +3
 *
 * ### Aim
 * * +Acc, modified per Maneuver or Effect, +1 after first turn.
 *
 * @param {Token} token - The token to control.
 */
export class TokenActions {
  constructor(token) {
    this.token = token
    this.actor = token.actor
    this.initValues()
  }

  static async fromToken(token) {
    const tokenActions = new TokenActions(token)
    return await tokenActions.init()
  }

  initValues() {
    this.atrLevels = this._getATRLevels()
    this.currentTurn = 1
    this.lastManeuver = undefined
    this.currentManeuver = undefined

    // Trackable resources per Turn
    this.totalBlocks = 0
    this.maxBlocks = 1
    this.totalParries = 0
    this.maxParries = Infinity
    this.totalMoves = 0
    this.maxMove = this.getMaxMove()

    this.canDefend = undefined
    this.canAttack = undefined
    this.canMove = undefined

    this.toHitBonus = 0
    this.defenseBonus = 0

    // Accumulative resources per Turn
    this.concentrateTurns = 0
    this.currentAim = this._getInitialAim()
    this.currentParry = this._getInitialParry()
    this.evaluateTurns = 0
    this.readyTurns = 0
    this.moveTurns = 0

    this.blindAsDefault = game.user.isGM
    this.lastAttack = {}
  }

  async clear() {
    this.initValues()
    await this.removeManeuverModifiers()
    await this.token.document.unsetFlag('gurps', 'tokenActions')
    await this.save()
  }

  async removeManeuverModifiers() {
    const allModifiers = await foundry.utils.getProperty(this.actor, 'system.conditions.usermods')
    const validModifiers = allModifiers.filter(m => !m.includes('#maneuver'))
    await this.actor.update({ 'system.conditions.usermods': validModifiers })
  }

  async init() {
    const savedTokenData = (await this.token.document.getFlag('gurps', 'tokenActions')) || {}
    this.currentTurn = savedTokenData.currentTurn || 1
    this.lastManeuver = savedTokenData.lastManeuver
    this.currentManeuver =
      (await foundry.utils.getProperty(this.actor, 'system.conditions.maneuver')) || savedTokenData.currentManeuver
    this.totalBlocks = savedTokenData.totalBlocks || 0
    this.maxBlocks = savedTokenData.maxBlocks || 1
    this.totalParries = savedTokenData.totalParries || 0
    this.maxParries = savedTokenData.maxParries || Infinity
    this.totalMoves = savedTokenData.totalMoves || 0
    this.maxMove = savedTokenData.maxMove || this.getMaxMove()
    this.canDefend = savedTokenData.canDefend
    this.canAttack = savedTokenData.canAttack
    this.canMove = savedTokenData.canMove
    this.toHitBonus = savedTokenData.toHitBonus || 0
    this.defenseBonus = savedTokenData.defenseBonus || 0
    this.concentrateTurns = savedTokenData.concentrateTurns || 0
    this.currentAim = savedTokenData.currentAim || this._getInitialAim()
    this.currentParry = savedTokenData.currentParry || this._getInitialParry()
    this.evaluateTurns = savedTokenData.evaluateTurns || 0
    this.readyTurns = savedTokenData.readyTurns || 0
    this.moveTurns = savedTokenData.moveTurns || 0
    this.blindAsDefault = savedTokenData.blindAsDefault !== undefined ? savedTokenData.blindAsDefault : game.user.isGM
    this.lastAttack = savedTokenData.lastAttack || {}
    return this
  }

  async save() {
    const newData = {
      currentTurn: this.currentTurn,
      lastManeuver: this.lastManeuver,
      currentManeuver: this.currentManeuver,
      totalBlocks: this.totalBlocks,
      maxBlocks: this.maxBlocks,
      totalParries: this.totalParries,
      maxParries: this.maxParries,
      totalMoves: this.totalMoves,
      maxMove: this.maxMove,
      canDefend: this.canDefend,
      canAttack: this.canAttack,
      canMove: this.canMove,
      toHitBonus: this.toHitBonus,
      defenseBonus: this.defenseBonus,
      concentrateTurns: this.concentrateTurns,
      currentAim: this.currentAim,
      currentParry: this.currentParry,
      evaluateTurns: this.evaluateTurns,
      readyTurns: this.readyTurns,
      moveTurns: this.moveTurns,
      blindAsDefault: this.blindAsDefault,
      lastAttack: this.lastAttack,
    }
    await this.token.document.setFlag('gurps', 'tokenActions', newData)
  }

  async saveLastAttack(chatThing, attacker) {
    this.lastAttack = { chatThing, attacker }
    await this.save()
  }

  async clearLastAttack() {
    this.lastAttack = {
      chatThing: null,
      attacker: null,
    }
    await this.save()
  }

  get currentMoveModifier() {
    return this.actor.system.conditions.move
  }
  get currentEffects() {
    return this.actor.system.conditions.self?.modifiers
  }
  get maxTurns() {
    return 1 + this.atrLevels
  }

  _getATRLevels() {
    const atr = this.actor.findByOriginalName('Altered Time Rate')
    if (!atr) return 0
    if (atr.levels) return atr.levels
    const levels = atr.name.match(/\d+/)
    return levels ? parseInt(levels[0]) : 1
  }

  _getInitialAim() {
    let currentAim = {}
    recurselist(this.actor.system.ranged, (e, _k, _d) => {
      currentAim[_k] = {
        aimBonus: 0,
        acc: parseInt(e.acc),
        uuid: e.uuid,
        name: e.name,
        originalName: e.originalName,
        startAt: 0,
        targetToken: undefined,
        key: `system.ranged.${_k}`,
      }
    })
    return currentAim
  }

  _getBaseParryPenalty(originalName) {
    let basePenalty = -4
    if (
      !!this.actor.findByOriginalName(`Weapon Master (${originalName})`) ||
      !!this.actor.findByOriginalName(`Trained By a Master`)
    ) {
      basePenalty = -2
    }
    return basePenalty
  }

  _getInitialParry() {
    let currentParry = {}
    recurselist(this.actor.system.melee, (e, _k, _d) => {
      currentParry[_k] = {
        currentPenalty: 0,
        uuid: e.uuid,
        name: e.name,
        originalName: e.originalName,
        startAt: undefined,
        basePenalty: this._getBaseParryPenalty(e.originalName),
        key: `system.melee.${_k}`,
      }
    })
    return currentParry
  }

  getMaxMove() {
    return this.actor.system.currentmove
  }

  /**
   * Return Strong Damage for AoA - Strong (B366)
   *
   * Some examples of damage expected:
   * 1d-1 cr, 2d+1 cut, 1d+2 imp, 1d-1 pi+
   *
   * Rule is to increase damage +2 or +1 per die, which is greater, for ST based damage only.
   *
   * After that, we will use the optional rule (B377) to round damage: +4 points = +1d
   *
   * @param {string} damage
   * @returns {string}
   */
  getStrongDamage(damage) {
    const validTypes = [
      'cr',
      'crush',
      'crushing',
      'piercing',
      'pi',
      'pi+',
      'pi-',
      'pi++',
      'small piercing',
      'piercing-',
      'large piercing',
      'piercing+',
      'huge piercing',
      'piercing++',
      'imp',
      'impaling',
      'cut',
      'cutting',
      'sw',
      'swing',
    ]
    let dice = damage.match(/(\d+)d/)?.[0]
    const add = damage.match(/d([+-]\d+)/)?.[0]
    const damageType = damage.match(/\d\s(.+)/)?.[0]
    if (!validTypes.includes(damageType)) return damage
    let newAdd = parseInt(add) + Math.max(dice, 2)
    while (newAdd >= 4) {
      newAdd -= 4
      dice += 1
    }
    return `${dice}d${newAdd} ${damageType}`
  }

  /**
   * Return current Skill level for Move and Attack (B365)
   *
   * @param {int} skillLevel
   * @param {string} attackType
   * @param {int} weaponBulk
   * @returns {number}
   */
  getMoveAndAttackLevel(skillLevel, attackType, weaponBulk = 0) {
    if (attackType === 'melee') {
      return Math.min(skillLevel - 4, 9)
    }
    return Math.min(skillLevel - Math.max(2, weaponBulk), 9)
  }

  /**
   * Remove Effect Modifiers created by the Maneuver.
   *
   * Currently, we need to implicit classify the modifiers by the '|' separator in effect description.
   *
   * @returns {Promise<void>}
   */
  async removeModifiers() {
    const allModifiers = await foundry.utils.getProperty(this.actor, 'system.conditions.usermods')
    const nonManeuverModifiers = allModifiers.filter(m => !m.includes('#maneuver'))
    await this.actor.update({ 'system.conditions.usermods': nonManeuverModifiers })
  }

  /**
   * Add Effect Modifiers created by the Maneuver.
   *
   * We need to implicit classify the modifiers by the '|' separator in effect description.
   *
   * @returns {Promise<void>}
   */
  async addModifiers() {
    const addModifier = mod => {
      if (!maneuverModifiers.includes(mod) && !allModifiers.includes(mod)) {
        maneuverModifiers.push(mod)
      }
    }

    const allModifiers = await foundry.utils.getProperty(this.actor, 'system.conditions.usermods')
    const maneuverModifiers = []
    if (this.toHitBonus !== 0) {
      const signal = this.toHitBonus > 0 ? '+' : '-'
      const signalLabel = game.i18n.localize(signal === '+' ? 'GURPS.toHitBonus' : 'GURPS.toHitPenalty')
      addModifier(`${signal}${this.toHitBonus} ${signalLabel} #hit #maneuver @man:${this.currentManeuver}`)
    }
    if (this.evaluateTurns > 0) {
      addModifier(`+${this.evaluateTurns} ${game.i18n.localize('GURPS.toHitBonus')} #hit #maneuver @man:evaluate`)
    }
    if (this.defenseBonus !== 0) {
      const signal = this.toHitBonus > 0 ? '+' : '-'
      const signalLabel = game.i18n.localize(signal === '+' ? 'GURPS.toDamageBonus' : 'GURPS.toDamagePenalty')
      addModifier(
        `${signal}${this.defenseBonus} ${signalLabel} #parry #block #dodge #maneuver @man:${this.currentManeuver}`
      )
    }
    if (this.evaluateTurns > 0) {
      addModifier(`+${this.evaluateTurns} ${i18n('GURPS.toHitBonus')} #hit #maneuver @man:evaluate`)
    }
    Object.keys(this.currentParry).map(k => {
      const parry = this.currentParry[k]
      if (parry.currentPenalty !== 0) {
        const signal = parry.currentPenalty > 0 ? '+' : '-'
        const signalLabel = game.i18n.localize(signal === '+' ? 'GURPS.toParryBonus' : 'GURPS.toParryPenalty')
        addModifier(`${signal}${parry.currentPenalty} ${signalLabel} ${parry.name} #parry #maneuver @${parry.key}`)
      }
    })
    Object.keys(this.currentAim).map(k => {
      const aim = this.currentAim[k]
      if (aim.aimBonus !== 0) {
        const signal = aim.aimBonus > 0 ? '+' : '-'
        const signalLabel = game.i18n.localize(signal === '+' ? 'GURPS.toAimBonus' : 'GURPS.toAimPenalty')
        addModifier(`${signal}${aim.aimBonus} ${signalLabel} ${aim.name} #hit #maneuver @${aim.key}`)
      }
    })
    await this.actor.update({
      'system.conditions.usermods': [...allModifiers, ...maneuverModifiers],
    })
  }

  /**
   * Get Maneuver Modifiers
   *
   * Call this method every time a new maneuver is selected.
   *
   * @param {Maneuver} maneuver
   * @returns {Promise<void>}
   */
  async updateManeuver(maneuver) {
    this.currentManeuver = maneuver.flags.gurps.name
    console.info(`Select Maneuver: '${this.currentManeuver}' for Token: ${this.token.name}`)

    await this.removeModifiers()

    this.maxMove = this.getMaxMove()
    this.toHitBonus = 0
    this.defenseBonus = 0
    this.maxParries = Infinity
    this.maxBlocks = 1

    switch (this.currentManeuver) {
      case 'do_nothing':
      case 'change_posture':
      case 'concentrate':
      case 'ready':
        this.canAttack = false
        this.canDefend = true
        this.canMove = false
        break
      case 'move':
      case 'aim':
      case 'evaluate':
      case 'feint':
      case 'aod_double':
        this.canAttack = false
        this.canDefend = true
        this.canMove = true
        break
      case 'attack':
      case 'wait':
        this.canAttack = true
        this.canDefend = true
        this.canMove = true
        break
      case 'aoa_determined':
        this.canAttack = true
        this.canDefend = false
        this.canMove = true
        this.toHitBonus = 4
        break
      case 'aoa_double':
      case 'aoa_feint':
      case 'aoa_strong':
      case 'aoa_suppress':
      case 'allout_attack':
        this.canAttack = true
        this.canDefend = false
        this.canMove = true
        break
      case 'aoa_ranged':
        this.canAttack = true
        this.canDefend = false
        this.canMove = true
        this.toHitBonus = 1
        break
      case 'move_and_attack':
        this.canAttack = true
        this.canDefend = true
        this.canMove = true
        this.maxParries = 0
        break
      case 'allout_defense':
      case 'aod_dodge':
      case 'aod_parry':
      case 'aod_block':
        this.canAttack = false
        this.canDefend = true
        this.canMove = true
        this.defenseBonus = 2
        break
      // Optional Maneuvers from Pyramid 3/77
      case 'allout_aim':
        this.canAttack = false
        this.canDefend = false
        this.canMove = false
        this.toHitBonus = 4
        break
      case 'committed_aim':
        this.canAttack = false
        this.canDefend = true
        this.canMove = true
        this.defenseBonus = -2
        this.maxParries = 0
        this.maxBlocks = 0
        break
      case 'committed_attack_ranged':
        this.canAttack = true
        this.canDefend = true
        this.canMove = true
        this.defenseBonus = -2
        this.toHitBonus = 1
        break
    }
    await this.addModifiers()
    await this.save()
  }

  /**
   * Create a new turn for the token.
   *
   * Call this method every time a new player turn is started.
   *
   * @returns {Promise<void>}
   */
  async newTurn() {
    console.info(`Starting New Turn for Token: ${this.token.name}`)
    this.currentTurn += 1
    this.lastManeuver = this.currentManeuver
    this.totalMoves = 0
    this.totalBlocks = 0
    this.totalParries = 0
    Object.keys(this.currentParry).map(k => {
      const p = this.currentParry[k]
      p.currentPenalty = 0
    })
    switch (this.lastManeuver) {
      case 'concentrate':
        console.log(`Add +1 Concentrate bonus to ${this.token.name}`)
        this.concentrateTurns += 1
        break
      case 'ready':
        console.log(`Add +1 Ready bonus to ${this.token.name})`)
        this.readyTurns += 1
        break
      case 'evaluate':
        this.evaluateTurns += 1
        if (this.evaluateTurns > 3) {
          this.evaluateTurns = 3
        } else {
          console.log(`Add +1 Evaluate bonus to ${this.token.name})`)
        }
        break
      case 'move':
        this.moveTurns += 1
        console.log(`Add +1 Move bonus to ${this.token.name})`)
        break
      case 'aim':
        Object.keys(this.currentAim).map(k => {
          const a = this.currentAim[k]
          if (!a.startAt) a.startAt = this.currentTurn - 1
          const dif = this.currentTurn - a.startAt
          if (dif === 1) {
            a.aimBonus += parseInt(a.acc) || 0
          } else if (dif <= 3) {
            a.aimBonus += 1
          }
        })
        break
    }
    if (this.lastManeuver !== 'evaluate' && this.evaluateTurns > 0) {
      this.evaluateTurns = 0
    }
    if (this.lastManeuver !== 'aim') {
      Object.keys(this.currentAim).map(k => {
        const a = this.currentAim[k]
        a.aimBonus = 0
        a.startAt = 0
      })
    }
    if (this.lastManeuver !== 'move' && this.moveTurns > 0) {
      this.moveTurns = 0
    }
    if (this.lastManeuver !== 'ready' && this.readyTurns > 0) {
      this.readyTurns = 0
    }
    if (this.lastManeuver !== 'concentrate' && this.concentrateTurns > 0) {
      this.concentrateTurns = 0
    }
    await this.addModifiers()
    await this.save()
    await this.token.setManeuver('do_nothing')
  }

  static getManeuverIcons(maneuverName) {
    const step = `<i class="fa-solid fa-shoe-prints can-do-icon" title="Step"></i>`
    const half = `<i class="fa-solid fa-lg fa-person-running can-do-icon" title="Half Move"></i>`
    const full = `<i class="fa-solid fa-lg fa-rabbit-running can-do-icon" title="Full Move"></i>`
    const noMove = `<i class="fa-solid fa-ban cant-do-icon" title="No Move"></i>`
    const canAttack = `<i class="fa-solid fa-swords can-do-icon" title="Can Attack"></i>`
    const NoAttack = `<i class="fa-solid fa-ban cant-do-icon" title="Can Not Attack"></i>`
    const canDefend = `<i class="fa-solid fa-shield-check can-do-icon" title="Can Defend"></i>`
    const NoDefense = `<i class="fa-solid fa-ban cant-do-icon" title="Can Not Defend"></i>`

    let icon
    switch (maneuverName) {
      case 'do_nothing':
        icon = `${noMove}${NoAttack}${canDefend}`
        break
      case 'move':
        icon = `${full}${NoAttack}${canDefend}`
        break
      case 'feint':
      case 'evaluate':
      case 'aim':
      case 'concentrate':
      case 'ready':
      case 'committed_aim':
        icon = `${step}${NoAttack}${canDefend}`
        break
      case 'attack':
      case 'committed_attack_ranged':
        icon = `${step}${canAttack}${canDefend}`
        break
      case 'aoa_double':
      case 'aoa_feint':
      case 'aoa_strong':
      case 'aoa_suppress':
      case 'allout_attack':
      case 'aoa_determined':
      case 'allout_aim':
      case 'aoa_ranged':
        icon = `${half}${canAttack}${NoDefense}`
        break
      case 'move_and_attack':
        icon = `${full}${canAttack}${canDefend}`
        break
      case 'aod_double':
      case 'allout_defense':
      case 'aod_dodge':
      case 'aod_parry':
      case 'aod_block':
        icon = `${half}${NoAttack}${canDefend}`
        break
      case 'change_posture':
        icon = `${noMove}${NoAttack}${canDefend}`
        break
      case 'wait':
        icon = `${full}${canAttack}${canDefend}`
        break
      default:
        icon = `${noMove}${NoAttack}${canDefend}` // Do nothing
    }
    return icon
  }
}
