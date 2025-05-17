import GURPSTokenHUD from './hud.js'
import { TokenGURPS } from './object.js'

export * from './object.js'
export * from './hud.js'

export function init(): void {
  Hooks.once('init', () => {
    CONFIG.Token.objectClass = TokenGURPS
    CONFIG.Token.hudClass = GURPSTokenHUD
  })
}
