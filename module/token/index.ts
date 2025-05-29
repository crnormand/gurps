import { GurpsToken } from './gurps-token.js'
import GurpsTokenHUD from './hud.js'

export * from './gurps-token.js'
export * from './hud.js'

export function init(): void {
  console.log('GURPS | Initializing GURPS Token Module')
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = GurpsToken
    CONFIG.Token.hudClass = GurpsTokenHUD
  })
}
