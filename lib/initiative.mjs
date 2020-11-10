'use strict'


Hooks.once("init", () => {
  console.log(CONFIG.Combat.initiative)

  CONFIG.Combat.initiative = {
    formula: "(1d6 / 1000) + @attributes.DX.value / 100 + @basicspeed.value * 100",
    decimals: 3
  }
})