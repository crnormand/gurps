import GurpsTokenHUD from './hud.js'
import { GurpsToken } from './gurps-token.js'
import { GurpsTokenHudV2 } from './token-hud.js'

export * from './gurps-token.js'
export * from './hud.js'

export function init(): void {
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = GurpsToken

    if (!game.release) return
    if (game.release?.generation >= 13) {
      // @ts-expect-error: waiting for types to catch up
      CONFIG.Token.hudClass = GurpsTokenHudV2
    } else {
      CONFIG.Token.hudClass = GurpsTokenHUD
    }
  })
}
