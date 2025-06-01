import ApplyDamageDialog from './applydamage.js'
import { DamageTable } from './damage-tables.js'
import DamageChat from './damagechat.js'
import { resolveDamageRollAction } from './resolve-damage-roll-action.js'

export function init() {
  console.log('GURPS | Initializing GURPS Damage module.')
  Hooks.on('renderChatMessage', DamageChat._renderDamageChat)
  Hooks.on('dropCanvasData', DamageChat._dropCanvasData)
  Hooks.on('gurpsinit', () => {
    GURPS.ApplyDamageDialog = ApplyDamageDialog
    GURPS.DamageChat = DamageChat
    GURPS.DamageTables = new DamageTable()
    GURPS.resolveDamageRoll = resolveDamageRollAction
  })
}

export { rollDamage } from './roll-damage.js'

// @ts-expect-error
const _typecheck: GurpsModule = { init }
