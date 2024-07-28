'use strict'

import { i18n } from './utilities.js'

/**
 * @typedef {object} Condition
 * @property {Attribute: number} breakpoint
 * @property {string} label
 * @property {string} style
 */

/** @type Record<string, Condition> */
const hpConditions = {
  NORMAL: {
    breakpoint: _ => Number.MAX_SAFE_INTEGER,
    label: 'GURPS.normal',
    style: 'normal',
  },
  REELING: {
    breakpoint: HP => Math.ceil(HP.max / 3) - 1,
    label: 'GURPS.STATUSReeling',
    style: 'reeling',
  },
  COLLAPSE: {
    breakpoint: _ => 0,
    label: 'GURPS.collapse',
    style: 'collapse',
  },
  CHECK1: {
    breakpoint: HP => -1 * HP.max,
    label: 'GURPS.check1',
    style: 'check',
  },
  CHECK2: {
    breakpoint: HP => -2 * HP.max,
    label: 'GURPS.check2',
    style: 'check',
  },
  CHECK3: {
    breakpoint: HP => -3 * HP.max,
    label: 'GURPS.check3',
    style: 'check',
  },
  CHECK4: {
    breakpoint: HP => -4 * HP.max,
    label: 'GURPS.check4',
    style: 'check',
  },
  DEAD: {
    breakpoint: HP => -5 * HP.max,
    label: 'GURPS.dead',
    style: 'dead',
  },
  DESTROYED: {
    breakpoint: HP => -10 * HP.max,
    label: 'GURPS.destroyed',
    style: 'destroyed',
  },
}

/** @type Record<string, Condition> */
const fpConditions = {
  NORMAL: {
    breakpoint: _ => Number.MAX_SAFE_INTEGER,
    label: 'GURPS.normal',
    style: 'normal',
  },
  REELING: {
    breakpoint: FP => Math.ceil(FP.max / 3) - 1,
    label: 'GURPS.tired',
    style: 'tired',
  },
  COLLAPSE: {
    breakpoint: _ => 0,
    label: 'GURPS.collapse',

    style: 'collapse',
  },
  UNCONSCIOUS: {
    breakpoint: FP => -1 * FP.max,
    label: 'GURPS.unconscious',
    style: 'unconscious',
  },
}

/*
 * Provides access to the HP and FP condition and breeakpoints.
 *
 * A Condition is a status of the entity based on its current hit points compared to its
 * HP maximum.
 *
 * A Breakpoint is the boundary of a condition. For example, if the "Reeling" condition
 * happens at 1/3 HP Max, and HP Max = 12, then the breakpoint between "Normal" and
 * "Reeling" is 4 (or, 12 / 3).
 */
export default class HitFatPoints {
  constructor() {
    this.setup()
  }

  setup() {
    // "this" must be bound to the methods BEFORE they are registered as handlebar helpers
    Handlebars.registerHelper('hpFpCondition', this._resolveCondition.bind(this))

    Handlebars.registerHelper('hpFpBreakpoints', this._resolveBreakpoints.bind(this))

    Handlebars.registerHelper('hpCondition', this.hpCondition.bind(this))
    Handlebars.registerHelper('hpBreakpoints', this.getHpBreakpoints.bind(this))

    Handlebars.registerHelper('fpCondition', this.fpCondition.bind(this))
    Handlebars.registerHelper('fpBreakpoints', this.getFpBreakpoints.bind(this))
  }

  /**
   * @param {string} type
   * @param {Attribute} value
   * @param {string} attr
   */
  _resolveCondition(type, value, attr) {
    if (type === 'HP') return this.hpCondition(value, attr)
    if (type === 'FP') return this.fpCondition(value, attr)
    throw `hpFpCondition called with invalid type: [${type}]`
  }

  /**
   * @param {Attribute} HP
   * @param {string} member
   */
  hpCondition(HP, member) {
    let key = this._getConditionKey(HP, hpConditions)
    // @ts-ignore
    return hpConditions[key][member]
  }

  /**
   * @param {Attribute} FP
   * @param {string} member
   */
  fpCondition(FP, member) {
    let key = this._getConditionKey(FP, fpConditions)
    // @ts-ignore
    return fpConditions[key][member]
  }

  /**
   * @param {Attribute} pts
   * @param {Record<string, Condition>} conditions
   */
  _getConditionKey(pts, conditions) {
    let found = 'NORMAL'
    for (const [key, value] of Object.entries(conditions)) {
      if (!!pts && pts.value > value.breakpoint(pts)) {
        return found
      }
      found = key
    }
    return found
  }

  /**
   * @param {string} type
   * @param {Attribute} value
   * @param {any} options
   */
  _resolveBreakpoints(type, value, options) {
    if (type === 'HP') return this.getHpBreakpoints(value, options)
    if (type === 'FP') return this.getFpBreakpoints(value, options)
    throw `hpFpBreakpoints called with invalid type: [${type}]`
  }

  /**
   * @param {Record<string, Condition>} conditions
   * @param {Attribute} pts
   * @param {any} options
   */
  _getBreakpoints(conditions, pts, options) {
    /** @type {{breakpoint: number, label: string, style: string}[]} */
    let list = []
    for (const [key, value] of Object.entries(conditions)) {
      let currentKey = this._getConditionKey(pts, conditions)
      list.push({
        breakpoint: Math.floor(value.breakpoint(pts || 0)),
        label: i18n(value.label),
        style: key === currentKey ? 'selected' : '',
      })
    }
    list.shift() // throw out the first element ('Normal')
    return this._buildOutput(list, options)
  }

  /**
   * @param {Attribute} HP
   * @param {any} options
   */
  getHpBreakpoints(HP, options) {
    return this._getBreakpoints(hpConditions, HP, options)
  }

  /**
   * @param {Attribute} FP
   * @param {any} options
   */
  getFpBreakpoints(FP, options) {
    return this._getBreakpoints(fpConditions, FP, options)
  }

  /**
   * @param {{breakpoint: number, label: string, style: string}[]} list
   * @param {{ fn: (arg0: any) => string; }} opt
   */
  _buildOutput(list, opt) {
    let results = ''
    list.forEach(item => {
      results += opt.fn(item)
    })
    return results
  }

  get hpConditions() {
    return hpConditions
  }
  get fpConditions() {
    return fpConditions
  }
}
