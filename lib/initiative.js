'use strict'

// Overkill? The class encapsulates the initiative strategy, and is responsible
// for setting that strategy during initialization.
export default class Initiative {
  constructor() {
    this.setup()
  }

  setup() {
    Hooks.once("init", () => {
      CONFIG.Combat.initiative = {
 //       formula: "(1d6 / 1000) + @attributes.DX.value / 100 + @basicspeed.value * 100",
        formula: "(1d6 / 1000) + (@attributes.DX.value / 100) + @basicspeed.value",
        decimals: 3
      }

//      console.log(CONFIG.Combat.initiative)
    })
  }
}
