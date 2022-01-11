import { setupSocket, teleportToDrawingInScene } from './dae.js'

const Teleport = 'Teleport'
const OTF = 'OTF'

Hooks.once('setup', function () {
  if (game.triggers) {
    console.log('Registering Trigger Happy support')
    game.triggers.registerEffect(Teleport);
    game.triggers.registerEffect(OTF);
    if (!setupSocket())
      uconsole.log("Unable to set up socket lib for DAE")
  }
})


export default class TriggerHappySupport {

  static init() {
    new TriggerHappySupport()._init()
  }

  _init() {
    Hooks.on('TriggerHappy', (key, args) => {
      switch (key) {
        case Teleport: 
          this.teleport(args)
          break;
        case OTF:
          this.otf(args)
        default:
          console.log("Unknown key: " + key)
      }
    })   
  }
  teleport(args) {
    if (!GURPS.LastToken) {
      ui.notifications.warn("No last token")
      return 
    }
    args = args.join(' ').split('/')
    let sn = args[0]
    let dn = args[1]
    if (!sn || !dn) {
      ui.notifications.warn('Requires  scene name / drawing name')
      return 
    }
    let scene = game.scenes.contents.find(s => s.name == sn)
    if (!scene) {
      ui.notifications.warn("Unable to find scene " + sn)
      return
    }
    let drawing =  scene.drawings.contents.find(d => d.data.text == dn)
    if (!drawing) {
      ui.notifications.warn("Unable to find drawing " + dn + " in scene " + sn)
      return
    }
    
    teleportToDrawingInScene(GURPS.LastToken, drawing, scene)
  }
  otf(args) {
    args = args.join(' ')
    GURPS.executeOTF(args)
  }
}

