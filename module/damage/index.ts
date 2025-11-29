import { GurpsModule } from 'module/gurps-module.js'
import ApplyDamageDialog from './applydamage.js'
import { DamageTable } from './damage-tables.js'
import DamageChat from './damagechat.js'
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
  // @ts-expect-error: Must update to HTML instead of JQuery.
  Hooks.on('renderChatMessage', DamageChat._renderDamageChat)
  // @ts-expect-error: Must update to HTML instead of JQuery.
  Hooks.on('dropCanvasData', DamageChat._dropCanvasData)
  Hooks.on('init', () => {
    GURPS.ApplyDamageDialog = ApplyDamageDialog
    GURPS.DamageChat = DamageChat
    GURPS.DamageTables = new DamageTable()
    GURPS.resolveDamageRoll = resolveDamageRollAction

    // preload drag-and-drop image
    {
      let img = new Image()
      img.src = 'systems/gurps/icons/blood-splatter-clipart-small.webp'
      DamageChat.damageDragImage = img // used in DamageChat._dropCanvasData
    }
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
