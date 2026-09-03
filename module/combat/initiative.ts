import { getInitiativeFormula, setInitiativeFormula } from './settings.js'

export function updateInitiativeFormula(broadcast: boolean) {
  let formula = getInitiativeFormula()

  if (!formula) {
    formula = DEFAULT_INITIATIVE_FORMULA
    if (game.user?.isGM) setInitiativeFormula(formula)
  }

  let match = formula.match(/([^:]*):?(\d)?/)

  if (!match) throw new Error(`Invalid initiative formula: ${formula}`)

  let decimals = match && !!match[2] ? parseInt(match[2]) : 5

  CONFIG.Combat.initiative = {
    formula: match ? match[1] : '',
    decimals: decimals, // Important to be able to maintain resolution
  }

  if (broadcast && match)
    game.socket?.emit('system.gurps', {
      type: 'initiativeChanged',
      formula: match[1],
      decimals: decimals,
    })
}

export const DEFAULT_INITIATIVE_FORMULA =
  '((@basicspeed.value*100) + (@attributes.DX.value / 100) + (1d6 / 1000)) / 100'
