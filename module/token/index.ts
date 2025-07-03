import { GurpsModule } from '../gurps-module.js'
import { GurpsToken } from './gurps-token.js'
import { GurpsTokenHUD } from './token-hud.js'
import { GurpsTokenRuler } from './token-ruler.js'

export * from './gurps-token.js'
export * from './quick-roll-settings.js'

function init(): void {
  console.log('GURPS | Initializing GURPS Token module.')
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = GurpsToken

    CONFIG.Token.hudClass = GurpsTokenHUD
    CONFIG.Token.rulerClass = GurpsTokenRuler
  })
}

export const Token: GurpsModule = {
  init,
}
