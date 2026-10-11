import type { GurpsModule } from '@gurps-types/gurps-module.js'

import ApplyDamageDialog from './applydamage.js'
import { DamageTable } from './damage-tables.js'
import { preloadDamageDragImage, renderDamageChat } from './damagechat.js'
import { calculateAndSelectTargetsForDamage } from './damageDrop.js'
import { resolveDamageRollAction } from './resolve-damage-roll-action.js'
import { rollDamage } from './roll-damage.js'
import initializeGameSettings, {
  defaultADDAction,
  defaultHitLocation,
  isSimpleADD,
  onlyGMsCanOpenADD,
  showTheMath,
  useArmorDivisor,
  useBluntTrauma,
  useHighTechBodyHits,
  useLocationWoundMods,
} from './settings.js'

interface DamageModule extends GurpsModule {
  rollDamage: typeof rollDamage
  calculateAndSelectTargetsForDamage: typeof calculateAndSelectTargetsForDamage
  settings: {
    isSimpleADD: () => boolean
    onlyGMsCanOpenADD: () => boolean
    defaultHitLocation: () => string
    useArmorDivisor: () => boolean
    useBluntTrauma: () => boolean
    useLocationWoundMods: () => boolean
    showTheMath: () => boolean
    useHighTechBodyHits: () => boolean
    defaultADDAction: () => string
  }
}

function init() {
  console.log('GURPS | Initializing GURPS Damage module.')
  Hooks.on('renderChatMessageHTML', renderDamageChat)
  Hooks.on('init', () => {
    GURPS.ApplyDamageDialog = ApplyDamageDialog
    GURPS.DamageTables = new DamageTable()
    GURPS.resolveDamageRoll = resolveDamageRollAction

    // preload drag-and-drop image
    preloadDamageDragImage()
    initializeGameSettings()
  })

  Hooks.on('ready', () => {
    // define Handlebars partials for ADD:
    const __dirname = 'systems/gurps/templates'

    foundry.applications.handlebars.loadTemplates([
      __dirname + '/apply-damage/effect-blunttrauma.hbs',
      __dirname + '/apply-damage/effect-crippling.hbs',
      __dirname + '/apply-damage/effect-headvitalshit.hbs',
      __dirname + '/apply-damage/effect-knockback.hbs',
      __dirname + '/apply-damage/effect-majorwound.hbs',
      __dirname + '/apply-damage/effect-shock.hbs',
    ])
  })
}

export const Damage: DamageModule = {
  init,
  rollDamage,
  calculateAndSelectTargetsForDamage,
  settings: {
    isSimpleADD,
    onlyGMsCanOpenADD,
    defaultHitLocation,
    useArmorDivisor,
    useBluntTrauma,
    useLocationWoundMods,
    showTheMath,
    useHighTechBodyHits,
    defaultADDAction,
  },
}
