import { setupSocket, teleport } from './dae.js'

const Teleport = 'Teleport'
const OTF = 'OTF'

Hooks.once('setup', function () {
  if (game.triggers) {
    console.log('Registering Trigger Happy support')
    game.triggers.registerEffect(Teleport)
    game.triggers.registerEffect(OTF)
    if (!setupSocket()) uconsole.log('Unable to set up socket lib for DAE')
  }
})

export default class TriggerHappySupport {
  static init() {
    new TriggerHappySupport()._init()
  }

  _init() {
    Hooks.on('TriggerHappy', async (key, args) => {
      switch (key) {
        case Teleport:
          this._teleport(args)
          break
        case OTF:
          this.otf(args)
          break
        default:
          console.log('Unknown key: ' + key)
      }
    })
  }
  _teleport(args) {
    if (!GURPS.LastTokenDocument) {
      ui.notifications.warn('No last token')
      return
    }
    args = args.join(' ').split('/')
    let sn = args[0]
    let tn = args[1]
    if (!tn) {
      // If only one name, assume the current scene
      tn = sn
      sn = canvas.scene.name
    }
    if (!tn) {
      ui.notifications.warn('Requires scene name / drawing (or token) name or just drawing (or token) name ')
      return
    }
    let scene = game.scenes.contents.find(s => s.name == sn)
    if (!scene) {
      ui.notifications.warn('Unable to find scene ' + sn)
      return
    }
    let target = scene.drawings.contents.find(d => d.data.text == tn)
    if (!target) target = scene.tokens.find(t => t.name == tn)
    if (!target) {
      ui.notifications.warn('Unable to find drawing or token ' + tn + ' in scene ' + sn)
      return
    }

    teleport(GURPS.LastTokenDocument, scene, target.data.x, target.data.y)
  }
  otf(args) {
    args = args.join(' ')
    GURPS.executeOTF(args)
  }
}
