import { GurpsTokenHUD } from './token-hud-12.js'
import { GurpsToken } from './gurps-token.js'
import { registerTokenHUD } from './token-hud.js'

export * from './gurps-token.js'
export * from './quick-roll-settings.js'

export function init(): void {
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = GurpsToken

    if (!game.release) return
    if (game.release?.generation >= 13) {
      // COMPATIBILITY: v12
      registerTokenHUD()
    } else {
      CONFIG.Token.hudClass = GurpsTokenHUD
    }
  })
}
