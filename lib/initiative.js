'use strict'


Hooks.once("init", () => {
  console.log(CONFIG.Combat.initiative)

  CONFIG.Combat.initiative = {
    formula: "(1d6 / 100000) + @attributes.DX.value / 10000 + @basicspeed.value",
    decimals: 5
  }
})