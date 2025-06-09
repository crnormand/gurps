import { GurpsModule } from 'module/gurps-module.js'
import ApplyDamageDialog from './applydamage.js'
import { DamageTable } from './damage-tables.js'
import DamageChat from './damagechat.js'
import { resolveDamageRollAction } from './resolve-damage-roll-action.js'
import { rollDamage } from './roll-damage.js'

interface DamageModule extends GurpsModule {
  rollDamage: typeof rollDamage
}

function init() {
  console.log('GURPS | Initializing GURPS Damage module.')
  Hooks.on('renderChatMessage', DamageChat._renderDamageChat)
  Hooks.on('dropCanvasData', DamageChat._dropCanvasData)
  Hooks.on('init', () => {
    GURPS.ApplyDamageDialog = ApplyDamageDialog
    GURPS.DamageChat = DamageChat
    GURPS.DamageTables = new DamageTable()
    GURPS.resolveDamageRoll = resolveDamageRollAction
  })
}

export const Damage: DamageModule = {
  init,
  rollDamage,
}
