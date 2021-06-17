'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { i18n, makeRegexPatternFrom, splitArgs, wait} from '../../lib/utilities.js'

const JB2A_PATREON = 'jb2a_patreon'
const JB2A_FREE = 'JB2A_DnD5e'
const JB2A_PATREON_DATA = `systems/gurps/utils/${JB2A_PATREON}.txt`
const JB2A_FREE_DATA = `systems/gurps/utils/${JB2A_FREE}.txt`
let JB2A_PATREON_LIBRARY = []
let JB2A_FREE_LIBRARY = []

Hooks.on('ready', async () => {

  if (game.modules.get(JB2A_PATREON)) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', JB2A_PATREON_DATA, true);
    xhr.responseType = 'text';
    xhr.onload = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200) {
          JB2A_PATREON_LIBRARY = xhr.responseText.split('\n').map(s => s.replace(/^\.\//, ""))
          console.log(`Loaded ${JB2A_PATREON_LIBRARY.length} JB2A PATREON records`)
        }
      }
    }
    xhr.send(null);
  } else if (game.modules.get(JB2A_FREE)) {
    let xhr2 = new XMLHttpRequest();
    xhr2.open('GET', JB2A_FREE_DATA, true);
    xhr2.responseType = 'text';
    xhr2.onload = function () {
      if (xhr2.readyState === xhr2.DONE) {
        if (xhr2.status === 200) {
          JB2A_FREE_LIBRARY = xhr2.responseText.split('\n').map(s => s.replace(/^\.\//, ""))
          console.log(`Loaded ${JB2A_FREE_LIBRARY.length} JB2A FREE records`)
        }
      }
    }
    xhr2.send(null);
  }
})

// stolen from the Ping module
function getMousePos(foundryCanvas) {
  const mouse = foundryCanvas.app.renderer.plugins.interaction.mouse.global;
  const t = foundryCanvas.stage.worldTransform;

  function calcCoord(axis) {
    return (mouse[axis] - t['t' + axis]) / foundryCanvas.stage.scale[axis];
  }

  return {
    x: calcCoord('x'),
    y: calcCoord('y')
  };
}

export class AnimChatProcessor extends ChatProcessor {
  help() {
    return '/anim &lt;stuff&gt;'
  }

  async drawEffect(effect, fromToken, toTokensArray) {
    let used = []
    for (const to of toTokensArray)
      if (effect.centered) 
        used = [...used, ...await this.drawSpecialToward(effect, to, fromToken)]
      else
        used = [...used, ...await this.drawSpecialToward(effect, fromToken, to)]
    return used
  }
  
  randFile(list) {
    let i = Math.floor(Math.random() * list.length)
    return list.splice(i,1)
  }
    
  async drawSpecialToward(effect, tok1, tok2) {
    const origin = {
      x: tok1.position.x + tok1.w / 2,
      y: tok1.position.y + tok1.h / 2
    }
    const target = {
      x: tok2.position.x + tok2.w / 2,
      y: tok2.position.y + tok2.h / 2
    }
    // Compute angle
    const deltaX = target.x - origin.x
    const deltaY = target.y - origin.y
    let rotation = Math.atan2(deltaY, deltaX)
    let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) 
    
    let files = []
    if (effect.centered) 
      files = effect.files.map(f => { return { file: f }})
    else {
      let best = 0
      for (const file of effect.files) {
        let m = file.match(/(?<w>\d+)x\d+\.webm/)
        if (!m) m = file.match(/(?<w>\d+)\.webm/)
        let s = distance / m.groups.w
        files.push({ file: file, scale: s, width: m.groups.w})
        if (s >= best && s < 1.0) best = s
      }
      if (best == 0) {
        best = Number.MAX_SAFE_INTEGER
        for (const file of files) {
          if (file.scale < best) best = file.scale
        }
      }
      files = files.filter(f => f.scale == best)
    }
    
    let possible = [...files]
    let count = effect.count
    let used = []
    while (count > 0) {
      count --
      const effectData = foundry.utils.mergeObject(effect, {
        position: {
          x: origin.x,
          y: origin.y
        },
        rotation: rotation,
        distance: distance
      });
      let file = this.randFile(possible)[0]
      if (possible.length == 0) possible = [...files]
      effectData.filedata = file
      effectData.file = file.file
      if (!effectData.centered) {
        let s = (effectData.distance * (1 + effectData.fudge)) / ((1 - effectData.anchor.x) * file.width) 
        effectData.scale.x = s
        effectData.scale.y = s
      }
      if (!effect.centered && Math.random() < 0.5) effectData.scale.y *= -1 // randomly flip vert orientation
      game.socket.emit('module.fxmaster', effectData);
      // Throw effect locally
      canvas.fxmaster.playVideo(effectData)
      used.push(effectData.file.split('/').pop())
      console.log(GURPS.objToString(effectData))
      if (count > 0) await wait(effectData.delay)
    }
    return used
  }
  
  errorExit(str) {
    ui.notifications.error(str);
    return false
  }
  
  randomInvert(y) {
    return Math.random() < 0.5 ? -1 * y: y  // used to randomize Y scale (give different 'looks' for animation)
  }

  matches(line) { 
    this.match = line.match(/^\/anim *(?<list>list)? *(?<center>c|center)? *(?<scale>[\*][\d\.]+)? *(?<x>-[\d\.]+)? *(?<fudge>\+[\d.]+)? *(?<file>[\S]+)? *(?<count>[\d\.]+[xX])?(?<delay>:[\d\.]+)? *(?<self>@self)? *(?<dest>@\d+,\d+)? *(?<click>@)? *$/)   
    return !!this.match
  }
  
  async awaitClick(line) {
    GURPS.IgnoreTokenSelect = true
    return new Promise( (resolve, reject) => {
      window.addEventListener('mousedown', (e) => { 
        let pt = getMousePos(game.canvas)
        e.preventDefault()
        e.stopPropagation()
        GURPS.IgnoreTokenSelect = false
        line = line + " @" + parseInt(pt.x) + "," + parseInt(pt.y)
        this.registry.processLine(line)
        resolve()
      }, {once: true})
    })
  }

  async process(line) {
    if (!canvas.fxmaster) return this.errorExit("This macro depends on the FXMaster module. Make sure it is installed and enabled")
    let files = []
    let m = this.match.groups
    
    if (!!m.list) {
      if (game.modules.get(JB2A_PATREON)) {
        ui.notifications.info("Opening JB2A PATREON Animation list...")
        window.open(new URL(JB2A_PATREON_DATA, window.location.origin))
      } else if (game.modules.get(JB2A_FREE)) {
        ui.notifications.info("Opening JB2A FREE Animation list...")
        window.open(new URL(JB2A_FREE_DATA, window.location.origin))
      } else return this.errorExit("This macro depends on one of the JB2A modules (free or patreon). Make sure at least one is installed.")     
      return true
    }
    let anim = m.file
    if (!anim) return this.errorExit("Must provide animation name")
    if (anim[0] == '/') 
      files = [anim.substr(1)]
    else {
      var path, lib
      if (game.modules.get(JB2A_PATREON)) {
        path = `modules/${JB2A_PATREON}/Library/`
        lib = JB2A_PATREON_LIBRARY
      } else if (game.modules.get(JB2A_FREE)) {
        path = `modules/${JB2A_FREE}/Library/`
        lib = JB2A_FREE_LIBRARY
      } else return this.errorExit("This macro depends on one of the JB2A modules (free or patreon). Make sure at least one is installed.")
      let pat = new RegExp(anim.split('*').join('.*?'), 'i')
      anim = lib.filter(e => e.match(pat))
      if (anim.length == 0) return this.errorExit(`Unable to find animation for '${pat}'`)
      files = anim.map(e => path + e) 
    }
        
    let opts = []
    let scale = 1.0
    let centered = !!m.center
    let x = centered ? 0.5 : 0
    let y = 0.5
    let fudge = 0
    let count = 1
    let delay = 1000
    if (!!m.scale) { 
      scale = parseFloat(m.scale.substr(1))  
      opts.push("Scale:" + scale)
    }
    if (!!m.count) {
      count = parseInt(m.count.slice(0, -1))
      opts.push("Count:" + count)
    }
    if (!!m.delay) {
      delay = 1000 * parseFloat(m.delay.substr(1))
      opts.push("Delay:" + m.delay.substr(1))
    }
    if (!!m.x) {
      x = parseFloat(m.x.substr(1))
      opts.push("Start:-" + x)
    }
    if (!!m.fudge) {
      fudge = parseFloat(m.fudge.substr(1))
      opts.push("End:+" + fudge)
    } 
    let srcToken = canvas.tokens.placeables.find(e => e.actor == GURPS.LastActor)
    if (!srcToken) srcToken = canvas.tokens.controlled[0]
    let destTokens = Array.from(game.user.targets)
    if (destTokens.length == 0) destTokens = canvas.tokens.controlled
    if (m.self) destTokens = [ srcToken ]
    if (m.dest) {
      let d = m.dest.substr(1).split(',')
      destTokens = [ {
        w: 0,
        h: 0,
        position: {
          x: +d[0],
          y: +d[1]
        }
      }]
    }
    if (destTokens.length == 0) {
      if (m.click) {
        ui.notifications.info("Please click the target location")
        this.send()
        await this.awaitClick((this.msgs().quiet ? '!' : '') + line.replace(/@ *$/,''))
        return true;
      } else
        return this.errorExit("You must select or target at least one token")
    }
    if (!srcToken) srcToken = destTokens[0]    // centered anims should show on target (or selection)
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
    this.priv("Src:" + srcToken?.name)
    this.priv("Dest:" + destTokens.map(e => e.name))
    this.priv("Opts: " + opts.join(', '))
    this.priv("Possible:")
    this.priv(anim.map(e => e.split('/').pop()).join('\n'))
    let used = await this.drawEffect(effect, srcToken, destTokens)
    this.priv("Used:\n" + used.join('\n'))
    this.send()
  }
}