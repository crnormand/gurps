'use strict'

import { wait } from '@util/utilities.js'

import ChatProcessor from './chat-processor.js'

const JB2A_PATREON = 'jb2a_patreon'
const JB2A_FREE = 'JB2A_DnD5e'
const JK_ANIM_SPELL = 'animated-spell-effects'
const JK_ANIM_SPELL_CARTOON = 'animated-spell-effects-cartoon'
const JAAMOD = 'jaamod'

let ANIM_LIBRARY = []

Hooks.on('ready', async () => {
  if (!addToLibrary(JB2A_PATREON)) addToLibrary(JB2A_FREE)
  addToLibrary(JK_ANIM_SPELL)
  addToLibrary(JK_ANIM_SPELL_CARTOON)
  addToLibrary(JAAMOD)
})

function addToLibrary(module) {
  if (game.modules.get(module)) {
    let xhr = new XMLHttpRequest()

    xhr.open('GET', 'systems/gurps/utils/' + module + '.txt', true)
    xhr.responseType = 'text'

    xhr.onload = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200) {
          let list = xhr.responseText.split('\n').map(text => text.replace(/^\.\//, ''))

          list = list.map(text => text.replace(/,width=/, ',W:'))
          list = list.map(text => `modules/${module}/${text}`)
          list = list.filter(text => fileWidth(text).width > 0)
          console.log(`Loaded ${list.length} ${module} records`)
          ANIM_LIBRARY = [...ANIM_LIBRARY, ...list]
        }
      }
    }

    xhr.send(null)

    return true
  }

  return false
}

function fileWidth(entry) {
  let match = entry.match(/\.webm,W:(\d+)/)

  if (match) return { file: entry.split(',')[0], width: +match[1] }

  //  console.log("Unknown format: " + entry)
  return { file: entry, width: 1 }
}

// stolen from the Ping module
function getMousePos(foundryCanvas) {
  const mouse = foundryCanvas.app.renderer.plugins.interaction.mouse.global
  const transform = foundryCanvas.stage.worldTransform

  function calcCoord(axis) {
    return (mouse[axis] - transform['t' + axis]) / foundryCanvas.stage.scale[axis]
  }

  return {
    x: calcCoord('x'),
    y: calcCoord('y'),
  }
}

export class AnimChatProcessor extends ChatProcessor {
  help() {
    return '/anim &lt;stuff&gt;'
  }

  async drawEffect(effect, fromToken, toTokensArray) {
    let used = []

    for (const to of toTokensArray)
      if (effect.centered) used = [...used, ...(await this.drawSpecialToward(effect, to, fromToken))]
      else used = [...used, ...(await this.drawSpecialToward(effect, fromToken, to))]

    return used
  }

  randFile(list) {
    let i = Math.floor(Math.random() * list.length)

    return list.splice(i, 1)
  }

  async drawSpecialToward(effect, tok1, tok2) {
    const origin = {
      x: tok1.position.x + tok1.w / 2,
      y: tok1.position.y + tok1.h / 2,
    }
    const target = {
      x: tok2.position.x + tok2.w / 2,
      y: tok2.position.y + tok2.h / 2,
    }
    // Compute angle
    const deltaX = target.x - origin.x
    const deltaY = target.y - origin.y
    let rotation = effect.noRotate || (effect.centered && !effect.move) ? 0 : Math.atan2(deltaY, deltaX)
    let distance = effect.centered && !effect.move ? 0 : Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    let files = []

    if (effect.centered) {
      files = effect.files.map(file => fileWidth(file))
    } else {
      let stretchfactor = 1 + effect.stretch
      let bestWidth = 0
      let best = 0

      for (const file of effect.files) {
        let fileInfo = fileWidth(file)
        let scale = distance / (fileInfo.width / stretchfactor)

        fileInfo.scale = scale
        files.push(fileInfo)

        if (scale >= best && scale < 1.0) {
          best = scale
          bestWidth = fileInfo.width
        }
      }

      if (best == 0) {
        best = Number.MAX_SAFE_INTEGER

        for (const file of files) {
          if (file.scale < best) {
            best = file.scale
            bestWidth = file.width
          }
        }
      }

      files = files.filter(file => file.width == bestWidth)
      this.priv(`Best fit (width:${bestWidth})`)
      files.forEach(file => {
        let lastFile = file.file.split('/').pop()

        this.priv(lastFile)
      })
    }

    let possible = [...files]
    let used = []
    let effects = []
    let stretch = 0

    for (let i = 0; i < effect.count; i++) {
      const effectData = { ...effect }

      effectData.position = {
        x: origin.x,
        y: origin.y,
      }
      effectData.rotation = rotation
      stretch = distance * (1 + effectData.stretch)
      let file = this.randFile(possible)[0]

      if (possible.length == 0) possible = [...files]
      effectData.file = file.file

      if (effectData.centered) {
        if (effectData.flip) effectData.scale.x *= -1
        if (effectData.move) effectData.distance = stretch
      } else {
        let scale = stretch / file.width

        effectData.scale = { x: scale, y: Math.random() < 0.5 ? -effectData.scale.y : effectData.scale.y } // randomly flip vert orientation
      }

      effects.push(effectData)
      used.push(effectData.file.split('/').pop())
    }

    this.executeEffects(effect.count, effects) // do NOT await this.

    return [used, stretch]
  }

  async executeEffects(count, effects) {
    for (let effectData of effects) {
      count--
      game.socket.emit('module.fxmaster', effectData)

      // Throw effect locally
      try {
        canvas.specials.playVideo(effectData)
      } catch {
        //in case people have older versions of fxmaster
        canvas.fxmaster.playVideo(effectData)
      }

      //console.log(GURPS.objToString(effectData))
      if (count > 0) await wait(effectData.delay)
    }
  }

  errorExit(str) {
    ui.notifications.error(str)

    return false
  }

  async awaitClick(line) {
    if (line.match(/@\d+,\d+/)) {
      console.log('Duplicate request for click: ' + line)

      return
    }

    ui.notifications.warn('Please click target')
    this.send()
    GURPS.IgnoreTokenSelect = true

    try {
      const location = await warpgate.crosshairs.show({
        interval: 0,
        size: 1,
        drawOutline: false,
        lockSize: true,
        labelOffset: { x: 0, y: -150 },
        icon: 'icons/skills/targeting/crosshair-bars-yellow.webp',
        //icon: 'icons/magic/symbols/runes-triangle-blue.webp',
        label: 'Click to target',
      })
      let grid_size = canvas.scene.grid.size

      canvas.tokens.targetObjects({
        x: location.x - grid_size / 2,
        y: location.y - grid_size / 2,
        height: grid_size,
        width: grid_size,
        releaseOthers: true,
      })
      GURPS.IgnoreTokenSelect = false
      line = line + ' @' + parseInt(location.x) + ',' + parseInt(location.y)
      this.registry.processLine(line)

      return
    } catch (error) {
      GURPS.IgnoreTokenSelect = false
      console.log(error)
    }

    return new Promise(resolve => {
      window.addEventListener(
        'mousedown',
        mouseDownEvent => {
          let pt = getMousePos(game.canvas)

          mouseDownEvent.preventDefault()
          mouseDownEvent.stopPropagation()
          let grid_size = canvas.scene.grid.size

          canvas.tokens.targetObjects({
            x: pt.x - grid_size / 2,
            y: pt.y - grid_size / 2,
            height: grid_size,
            width: grid_size,
            releaseOthers: true,
          })
          GURPS.IgnoreTokenSelect = false
          line = line + ' @' + parseInt(pt.x) + ',' + parseInt(pt.y)
          this.registry.processLine(line)
          resolve()
        },
        { once: true }
      )
    })
  }

  async displaylist() {
    let list = ANIM_LIBRARY.map(text => text.replace(/modules\//, ''))

    list = ['Total: ' + ANIM_LIBRARY.length, ...list]

    new foundry.applications.api.DialogV2({
      window: {
        title: 'Anim library',
        resizable: true,
      },
      position: {
        width: 1200,
        height: 'auto',
      },
      content: `<textarea name='text' style='color: darkslategray;' readonly rows='30'>${list.join('\n')}</textarea>`,
      buttons: [
        {
          action: 'cancel',
          label: 'GURPS.ok',
          icon: 'fas fa-times',
          callback: () => undefined, // Resolve with undefined if cancelled
        },
      ],
    }).render({ force: true })
  }

  matches(line) {
    // TODO This should be able to match ONLY '/anim' and then show the usage.
    this.match = line.match(
      /^\/anim +(?<list>list)? *(?<wait>w[\d.]+)? *(?<file>[\S]+)? *(?<center>cf?m?n?\d*(:[\d.]+,[\d.]+)?)? *(?<scale>\*[\d.]+)? *(?<x>-[\d.]+)? *(?<stretch>[+>][\d.]+)? *(?<count>[\d.]+[xX])?(?<delay>:[\d.]+)? *(?<dest>@\d+,\d+)? *(?<self>@(s|self|src)?)?/
    )

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^[/?]anim$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpAnim')
  }

  async process(line) {
    if (!canvas.fxmaster)
      return this.errorExit('This macro depends on the FXMaster module. Make sure it is installed and enabled')
    let files = []
    let matchGroups = this.match.groups

    if (ANIM_LIBRARY.length == 0)
      return this.errorExit(
        'This macro depends on one of the JB2A modules (free or patreon) or Animated Spell Effects. Make sure at least one is installed.'
      )

    if (matchGroups.list) {
      this.displaylist()

      return true
    }

    if (!matchGroups.file) return this.errorExit('Must provide animation name')

    if (matchGroups.file[0] == '/') files = [matchGroups.file.substr(1)]
    else {
      let pat = new RegExp(matchGroups.file.split('*').join('.*?').replace(/\//g, '\\/'), 'i')

      files = ANIM_LIBRARY.filter(animationPath => animationPath.match(pat))
      if (files.length == 0) return this.errorExit(`Unable to find animation for '${pat}'`)
    }

    if (matchGroups.wait) {
      let seconds = parseFloat(matchGroups.wait.substr(1))

      await wait(seconds * 1000)
    }

    let opts = []
    let scale = 1.0
    let flip = false
    let centered = false
    let move = false
    let x = 0
    let y = 0.5
    let angle = 0
    let noRotate = false
    let stretch = 0
    let count = 1
    let delay = 1000

    if (matchGroups.center) {
      centered = true
      x = 0.5
      let token = matchGroups.center.match(/c(f)?(m)?(n)?(\d*)(:[\d.]+,[\d.]+)?/)

      flip = !!token[1]
      move = !!token[2]
      if (move) x = 0.5
      if (token[3]) noRotate = true
      angle = token[4] ? +token[4] : 0

      if (token[5]) {
        let offset = token[5].substr(1).split(',')

        x = parseFloat(offset[0])
        y = parseFloat(offset[1])
      }

      opts.push('Centered ' + (flip ? ' flip' : '') + (move ? ' move' : '') + ':' + angle)
      opts.push('Offset: ' + x + ',' + y)
    } else opts.push('Targeted')

    if (matchGroups.scale) {
      scale = parseFloat(matchGroups.scale.substr(1))
      opts.push('Scale:' + scale)
      if (!centered) this.priv('Scale option only valid on Centered animation')
    }

    if (matchGroups.count) {
      count = parseInt(matchGroups.count.slice(0, -1))
      opts.push('Count:' + count)
    }

    if (matchGroups.delay) {
      delay = 1000 * parseFloat(matchGroups.delay.substr(1))
      opts.push('Delay:' + matchGroups.delay.substr(1))
    }

    if (matchGroups.x) {
      x = parseFloat(matchGroups.x.substr(1))
      opts.push('Anchor:-' + x)
      if (centered) this.priv('Anchor option only valid on Targeted animation')
    }

    if (matchGroups.stretch) {
      stretch = parseFloat(matchGroups.stretch.substr(1))
      opts.push('Stretch:+' + stretch)
      if (centered && !move) this.priv('Stretch option only valid on moving animations')
    }

    let srcToken = canvas.tokens.placeables.find(token => token.actor == GURPS.LastActor)

    if (!srcToken) srcToken = canvas.tokens.controlled[0]
    let destTokens = Array.from(game.user.targets)

    if (destTokens.length == 0 && game.user.isGM) destTokens = canvas.tokens.controlled
    if (matchGroups.self && srcToken) destTokens = [srcToken]

    if (matchGroups.dest) {
      let dest = matchGroups.dest.substr(1).split(',')

      destTokens = [
        {
          name: 'User click',
          w: 0,
          h: 0,
          position: {
            x: +dest[0],
            y: +dest[1],
          },
        },
      ]
    }

    if (destTokens.length == 0) {
      if (!srcToken) {
        ui.notifications.error('No token or actor selected')

        return false
      }

      await this.awaitClick((this.msgs().quiet ? '!' : '') + line.replace(/@ *$/, ''))

      return true
    }

    if (!srcToken) srcToken = destTokens[0] // centered anims should show on target (or selection)

    if ((!centered || move) && destTokens.length == 1 && destTokens[0] == srcToken) {
      await this.awaitClick((this.msgs().quiet ? '!' : '') + line.replace(/@ *$/, ''))

      return true
    }

    if (move) {
      let temp = srcToken

      srcToken = destTokens[0]
      destTokens = [temp]
    }

    let effect = {
      files: files,
      anchor: {
        x: x,
        y: y,
      },
      scale: {
        x: scale,
        y: scale,
      },
      stretch: stretch,
      centered: centered,
      move: move,
      angle: angle,
      noRotate: noRotate,
      flip: flip,
      count: count,
      delay: delay,
    }

    this.priv('Src:' + srcToken?.name)
    this.priv('Dest:' + destTokens.map(token => token?.name))
    this.priv('Opts: ' + opts.join(', '))
    this.priv('Possible:')
    this.priv(files.map(animationPath => animationPath.split('/').pop()).join('<br>'))
    let [used, dist] = await this.drawEffect(effect, srcToken, destTokens)

    this.priv('Used:<br>' + used.join('<br>'))
    this.priv('Dist: ' + dist)
    this.send()
  }
}
