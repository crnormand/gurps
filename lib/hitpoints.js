'use strict'

import { i18n } from './utilities.js'

const hpConditions = {
  NORMAL: {
    breakpoint: _ => Number.MAX_SAFE_INTEGER,
    label: 'GURPS.normal',
    style: 'normal',
  },
  REELING: {
    breakpoint: HP => HP.max / 3,
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

const fpConditions = {
  NORMAL: {
    breakpoint: _ => Number.MAX_SAFE_INTEGER,
    label: 'GURPS.normal',
    style: 'normal',
  },
  REELING: {
    breakpoint: FP => FP.max / 3,
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

  _resolveCondition(type, value, attr) {
    if (type === 'HP') return this.hpCondition(value, attr)
    if (type === 'FP') return this.fpCondition(value, attr)
    throw `hpFpCondition called with invalid type: [${type}]`
  }

  _resolveBreakpoints(type, value, opt) {
    if (type === 'HP') return this.getHpBreakpoints(value, opt)
    if (type === 'FP') return this.getFpBreakpoints(value, opt)
    throw `hpFpBreakpoints called with invalid type: [${type}]`
  }

  _getConditionKey(pts, conditions) {
    let found = conditions['NORMAL']
    for (const [key, value] of Object.entries(conditions)) {
      if (!!pts && pts.value > value.breakpoint(pts)) {
        return found
      }
      found = key
    }
    return found
  }

  _getBreakpoints(conditions, pts, opt) {
    let list = []
    for (const [key, value] of Object.entries(conditions)) {
      let currentKey = this._getConditionKey(pts, conditions)
      list.push({
        breakpoint: Math.floor(value.breakpoint(pts || 0)).toString(),
        label: i18n(value.label),
        style: key === currentKey ? 'selected' : '',
      })
    }
    list.shift() // throw out the first element ('Normal')
    return this._buildOutput(list, opt)
  }

  getHpBreakpoints(HP, opt) {
    return this._getBreakpoints(hpConditions, HP, opt)
  }

  hpCondition(HP, member) {
    let key = this._getConditionKey(HP, hpConditions)
    return hpConditions[key][member]
  }

  getFpBreakpoints(FP, opt) {
    return this._getBreakpoints(fpConditions, FP, opt)
  }

  fpCondition(FP, member) {
    let key = this._getConditionKey(FP, fpConditions)
    return fpConditions[key][member]
  }

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
