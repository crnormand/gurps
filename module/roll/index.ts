import { GurpsModule } from 'module/gurps-module.js'
import { SuccessRoll } from './success-roll.js'

interface RollModule extends GurpsModule {}

function init() {
  console.log('GURPS | Initializing GURPS Roll module.')
  Hooks.on('init', () => {
    CONFIG.Dice.rolls.push(SuccessRoll)
  })
}

export const Roll: RollModule = {
  init,
}
