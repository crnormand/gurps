'use strict'

// Overkill? The class encapsulates the initiative strategy, and is responsible
// for setting that strategy during initialization.
export default class Initiative {
  constructor() {
    this.setup()
  }
  
  static defaultFormula() {
    return "((@basicspeed.value*100) + (@attributes.DX.value / 100) + (1d6 / 1000)) / 100"
  }

  setup() {
    Hooks.once("init", () => {
      CONFIG.Combat.initiative = {
        formula: Initiative.defaultFormula(),
        decimals: 5   // Important to be able to maintain resolution
      }
    })
  }
}
