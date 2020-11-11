'use strict'

const hpConditions = {
  NORMAL: {
    breakpoint: (_) => Number.MAX_SAFE_INTEGER,
    label: 'Normal',
    style: 'normal'
  },
  REELING: {
    breakpoint: (HP) => (HP.max / 3),
    label: 'Reeling',
    style: 'reeling'
  },
  COLLAPSE: {
    breakpoint: (_) => 0,
    label: 'Collapse',
    style: 'collapse'
  },
  CHECK1: {
    breakpoint: (HP) => -1 * HP.max,
    label: 'Check #1',
    style: 'check'
  },
  CHECK2: {
    breakpoint: (HP) => -2 * HP.max,
    label: 'Check #2',
    style: 'check'
  },
  CHECK3: {
    breakpoint: (HP) => -3 * HP.max,
    label: 'Check #3',
    style: 'check'
  },
  CHECK4: {
    breakpoint: (HP) => -4 * HP.max,
    label: 'Check #4',
    style: 'check'
  },
  DEAD: {
    breakpoint: (HP) => -5 * HP.max,
    label: 'Dead',
    style: 'dead'
  },
  DESTROYED: {
    breakpoint: (HP) => -10 * HP.max,
    label: 'Destroyed',
    style: 'destroyed'
  }
}

const fpConditions = {
  NORMAL: {
    breakpoint: (_) => Number.MAX_SAFE_INTEGER,
    label: 'Normal',
    style: 'normal'
  },
  REELING: {
    breakpoint: (FP) => (FP.max / 3),
    label: 'Tired',
    style: 'tired'
  },
  COLLAPSE: {
    breakpoint: (_) => 0,
    label: 'Collapse',
    style: 'collapse'
  },
  UNCONSCIOUS: {
    breakpoint: (FP) => -1 * FP.max,
    label: 'Unconscious',
    style: 'unconscious'
  }
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

    // In javascript, "this" is NOT automatically inherited by a function. If you 
    // pass a function as an object to be called by some other code, "this" resolves
    // to the *caller*, not the class in which the function is defined. We can fix 
    // it by binding "this" to the function object.
    this.fpCondition = this.fpCondition.bind(this)
    this.getFpBreakpoints = this.getFpBreakpoints.bind(this)
    this.hpCondition = this.hpCondition.bind(this)
    this.getHpBreakpoints = this.getHpBreakpoints.bind(this)
  }

  setup() {
    let self = this
    Hooks.once("init", async function () {
      Handlebars.registerHelper('hpCondition', self.hpCondition)
      Handlebars.registerHelper('hpBreakpoints', self.getHpBreakpoints)

      Handlebars.registerHelper('fpCondition', self.fpCondition);
      Handlebars.registerHelper('fpBreakpoints', self.getFpBreakpoints);
    })
  }

  _getConditionKey(pts, conditions) {
    let found = conditions['NORMAL']
    for (const [key, value] of Object.entries(conditions)) {
      if (pts.value > value.breakpoint(pts)) { return found }
      found = key
    }
    return found
  }

  _getBreakpoints(conditions, pts, opt) {
    let list = []
    for (const [key, value] of Object.entries(conditions)) {
      let currentKey = this._getConditionKey(pts, conditions)
      list.push({
        breakpoint: Math.floor(value.breakpoint(pts)).toString(),
        label: value.label.toString(),
        style: (key === currentKey) ? 'selected' : ''
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
    list.forEach((item) => {
      results += opt.fn(item)
    })
    return results
  }

  get hpConditions() { return hpConditions }
  get fpConditions() { return fpConditions }
}