import { GurpsModule } from '@types/gurps-module.ts'

import { GurpsToken } from './gurps-token.js'
import { GurpsTokenHUDV2 } from './token-hud.js'
import { GurpsTokenRuler } from './token-ruler.js'

export * from './gurps-token.js'
export * from './quick-roll-settings.js'

function init(): void {
  console.log('GURPS | Initializing GURPS Token module.')
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = GurpsToken
    CONFIG.Token.rulerClass = GurpsTokenRuler
    CONFIG.Token.hudClass = GurpsTokenHUDV2
  })
}

export const Token: GurpsModule = {
  init,
}
