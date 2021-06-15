'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { i18n, makeRegexPatternFrom, splitArgs, wait} from '../../lib/utilities.js'

const JB2A_PATREON = 'systems/gurps/utils/jb2a_patreon.txt'
const JB2A_FREE = 'systems/gurps/utils/JB2A_DnD5e.txt'
let JB2A_PATREON_LIBRARY = []
let JB2A_FREE_LIBRARY = []
Hooks.on('ready', async () => {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', JB2A_PATREON, true);
  xhr.responseType = 'text';
  xhr.onload = function () {
    if (xhr.readyState === xhr.DONE) {
      if (xhr.status === 200) {
        JB2A_PATREON_LIBRARY = xhr.responseText.split('\n')
        console.log(`Loaded ${JB2A_PATREON_LIBRARY.length} JB2A PATREON records`)
      }
    }
  }
  xhr.send(null);
  let xhr2 = new XMLHttpRequest();
  xhr2.open('GET', JB2A_FREE, true);
  xhr2.responseType = 'text';
  xhr2.onload = function () {
    if (xhr2.readyState === xhr2.DONE) {
      if (xhr2.status === 200) {
        JB2A_FREE_LIBRARY = xhr2.responseText.split('\n')
        console.log(`Loaded ${JB2A_FREE_LIBRARY.length} JB2A FREE records`)
      }
    }
  }
  xhr2.send(null);
})

export class AnimChatProcessor extends ChatProcessor {
  help() {
    return '/anim &lt;stuff&gt;'
  }

  drawEffect(effect, fromToken, toTokensArray) {
    for (const to of toTokensArray)
      this.drawSpecialToward(effect, fromToken, to);
  }
  
  randFile(list) {
    let i = Math.floor(Math.random() * list.length)
    return list.splice(i,1)
  }
    

  async drawSpecialToward(effect, tok1, tok2) {
    let possible = [...effect.files]
    let count = effect.count
    while (count > 0) {
      count --
      let file = this.randFile(possible)[0]
      if (possible.length == 0) possible = [...effect.files]
      effect.file = file
      let m = file.match(/(?<w>\d+)x\d+\.webm$/)
      if (!m) m = file.match(/(?<w>\d+)\.webm$/)
      const origin = {
        x: tok1.position.x + tok1.w / 2,
        y: tok1.position.y + tok1.h / 2
      }
      const effectData = foundry.utils.mergeObject(effect, {
        position: {
          x: origin.x,
          y: origin.y
        }
      });
      const target = {
        x: tok2.position.x + tok2.w / 2,
        y: tok2.position.y + tok2.h / 2
      }
      // Compute angle
      const deltaX = target.x - origin.x
      const deltaY = target.y - origin.y
      effectData.rotation = Math.atan2(deltaY, deltaX)
  
      effectData.distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) // - (1 - effectData.anchor.x) * tok2.width;
      if (!effectData.centered && !!m) {
        let s = (effectData.distance + effectData.fudge) / ((1 - effectData.anchor.x) * m.groups.w) 
        s = Math.min(1.0, s)
        effectData.scale.x = s
        effectData.scale.y = s
      }
      console.log(GURPS.objToString(effectData))
        // And to other clients
      game.socket.emit('module.fxmaster', effectData);
      // Throw effect locally
      canvas.fxmaster.playVideo(effectData)
      if (count > 0) await wait(effectData.delay)
    }
  }
  
  errorExit(str) {
    ui.notifications.error(str);
    return false
  }
  
  randomInvert(y) {
    return Math.random() < 0.5 ? -1 * y: y  // used to randomize Y scale (give different 'looks' for animation)
  }

  matches(line) { 
    this.match = line.match(/^\/anim *(?<list>list)? *(?<count>[xX][\d\.]+)?(?<delay>:[\d\.]+)? *(?<scale>[\*][\d\.]+)? *(?<x>[\d\.]+)? *(?<y>[\d\.]+)? *(?<fudge>\+[\d]+)? *(?<file>.*)/)   
    return !!this.match
  }

  async process(line) {
    if (!canvas.fxmaster) return this.errorExit("This macro depends on the FXMaster module. Make sure it is installed and enabled")
    let files = []
    let m = this.match.groups
    if (!!m.list) {
      ui.notifications.info("Opening Animation lists...")
      window.open(new URL(JB2A_FREE, window.location.origin))
      window.open(new URL(JB2A_PATREON, window.location.origin))
      return true
    }
    let anim = m.file
    if (anim[0] == '/') 
      files = [anim.substr(1)]
    else {
      var path, lib
      if (game.modules.get("jb2a_patreon")) {
        path = "modules/jb2a_patreon/Library/"
        lib = JB2A_PATREON_LIBRARY
      } else if (game.modules.get("JB2A_DnD5e")) {
        path = "modules/JB2A_DnD5e/Library/"
        lib = JB2A_FREE_LIBRARY
      } else return this.errorExit("This macro depends on one of the JB2A modules (free or patreon). Make sure at least one is installed and enabled")
      let pat = new RegExp(anim.split('*').join('.*?'), 'i')
      anim = lib.filter(e => e.match(pat))
      if (anim.length == 0) return this.errorExit(`Unable to find animation for '${pat}'`)
      files = anim.map(e => path + e) 
    }
        
    let scale = 1.0
    let centered = true
    let x = 0.5
    let y = 0.5
    let fudge = 0
    let count = 1
    let delay = 1000
    if (!!m.scale) scale = parseFloat(m.scale.substr(1))  
    if (!!m.count) count = parseInt(m.count.substr(1))
    if (!!m.delay) delay = 1000 * parseFloat(m.delay.substr(1))
  
    if (!!m.x) { 
      x = parseFloat(m.x)
      centered = false 
    }
    if (!!m.y) {
      y = parseFloat(m.y)
      centered = false
    }
    if (!!m.fudge) {
      fudge = parseInt(m.fudge)
      centered = false
    }

    let srcToken = canvas.tokens.placeables.find(e => e.actor == GURPS.LastActor)
    if (!srcToken) srcToken = canvas.tokens.controlled[0]
 
    let destTokens = Array.from(game.user.targets)
    if (destTokens.size == 0) destTokens = canvas.tokens.controlled
    if (destTokens.size == 0)
      if (srcToken)
        destTokens = [ srcToken ]
      else return errorExit("You must select or target at least one token")

    if (centered) srcToken = destTokens[0]    // centered anims should show on target (or selection)
        
    let effect = {
      files: files,
      anchor: {
        x: x,
        y: y,
      },
      speed: 0,
      angle: 0,
      scale: {
        x: scale,
        y: scale,
      },
      fudge: fudge,
      centered: centered,
      count: count,
      delay: delay
     }
    this.priv("Src:" + srcToken.name)
    this.priv("Dest:" + destTokens.map(e => e.name))
    this.priv(anim.map(e => e.split('/').pop()).join('\n'))
    this.drawEffect(effect, srcToken, destTokens)
  }
}