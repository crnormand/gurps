'use strict'

import { ActorImporter } from '@module/actor/actor-importer.js'
import { ChatProcessors } from '@module/chat.js'
import { NpcInput } from '@module/util/npc-input.js'
import { parselink } from '@util/parselink.js'
import { escapeHtml, isNiceDiceEnabled, makeRegexPatternFrom, splitArgs, wait } from '@util/utilities.js'

import Maneuvers from '../actor/maneuver.js'
import { AnimChatProcessor } from '../chat/anim.js'
import SlamChatProcessor from '../chat/slam.js'
import StatusChatProcessor from '../chat/status.js'
import TrackerChatProcessor from '../chat/tracker.js'

import ChatProcessor from './chat-processor.js'
import {
  EveryoneAChatProcessor,
  EveryoneBChatProcessor,
  EveryoneCChatProcessor,
  RemoteChatProcessor,
} from './everything.js'
import { FrightCheckChatProcessor } from './frightcheck.js'
import { IfChatProcessor } from './if.js'

export default function RegisterChatProcessors() {
  ChatProcessors.registerProcessor(new RollAgainstChatProcessor())
  ChatProcessors.registerProcessor(new MookChatProcessor())
  ChatProcessors.registerProcessor(new SelectChatProcessor())
  ChatProcessors.registerProcessor(new EveryoneAChatProcessor())
  ChatProcessors.registerProcessor(new EveryoneBChatProcessor())
  ChatProcessors.registerProcessor(new EveryoneCChatProcessor())
  ChatProcessors.registerProcessor(new RollChatProcessor())
  ChatProcessors.registerProcessor(new ShowMBsChatProcessor())
  ChatProcessors.registerProcessor(new ClearMBsChatProcessor())
  ChatProcessors.registerProcessor(new StatusChatProcessor())
  ChatProcessors.registerProcessor(new FrightCheckChatProcessor())
  ChatProcessors.registerProcessor(new UsesChatProcessor())
  ChatProcessors.registerProcessor(new QtyChatProcessor())
  ChatProcessors.registerProcessor(new FpHpChatProcessor())
  ChatProcessors.registerProcessor(new SendMBChatProcessor())
  ChatProcessors.registerProcessor(new ChatExecuteChatProcessor())
  ChatProcessors.registerProcessor(new TrackerChatProcessor())
  ChatProcessors.registerProcessor(new IfChatProcessor())
  ChatProcessors.registerProcessor(new SetEventFlagsChatProcessor())
  ChatProcessors.registerProcessor(new RemoteChatProcessor())
  ChatProcessors.registerProcessor(new SlamChatProcessor())
  ChatProcessors.registerProcessor(new LightChatProcessor())
  ChatProcessors.registerProcessor(new ForceMigrateChatProcessor())
  ChatProcessors.registerProcessor(new ReimportChatProcessor())
  ChatProcessors.registerProcessor(new ShowChatProcessor())
  ChatProcessors.registerProcessor(new AnimChatProcessor())
  ChatProcessors.registerProcessor(new WaitChatProcessor())
  ChatProcessors.registerProcessor(new WhisperChatProcessor())
  ChatProcessors.registerProcessor(new RolltableChatProcessor())
  ChatProcessors.registerProcessor(new RefreshItemsChatProcessor())
  ChatProcessors.registerProcessor(new QuickDamageChatProcessor())
  ChatProcessors.registerProcessor(new SoundChatProcessor())
  ChatProcessors.registerProcessor(new DevChatProcessor())
  ChatProcessors.registerProcessor(new ManeuverChatProcessor())
  ChatProcessors.registerProcessor(new RepeatChatProcessor())
  ChatProcessors.registerProcessor(new StopChatProcessor())
  ChatProcessors.registerProcessor(new ModChatProcessor())
  ChatProcessors.registerProcessor(new DRChatProcessor())
}

class SoundChatProcessor extends ChatProcessor {
  help() {
    return '/sound &lt;path-to-sound&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/sound +(?<wait>w[\d.]+)? *(?<vol>v[\d.]+)? *(?<file>.*)/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?]sound$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpSound')
  }

  async process(_line) {
    let volume = 0.8

    if (this.match.groups.vol) volume = parseFloat(this.match.groups.vol.substr(1))
    if (this.match.groups.wait) await wait(parseFloat(this.match.groups.wait.substr(1)) * 1000)
    let data = {
      src: this.match.groups.file.trim(),
      volume,
      loop: false,
    }

    if (!data.src.endsWith('.txt')) {
      AudioHelper.play(data, true).then(sound => {
        if (sound.failed) ui.notifications.warn('Unable to play: ' + data.src)
      })

      return true
    }

    let xhr = new XMLHttpRequest()

    xhr.open('GET', data.src, true)
    xhr.responseType = 'text'

    xhr.onload = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200) {
          let list = xhr.responseText
            .split('\n')
            .map(text => text.replace(/^\.\//, ''))
            .filter(text => !!text && !text.endsWith('.txt'))
          let index = Math.floor(Math.random() * list.length)
          let filepath = data.src.split('/').slice(0, -1).join('/') + '/' + list[index]

          console.log(`Loaded ${list.length} sounds, picked: ${index}:${filepath}`)
          data.src = filepath
          AudioHelper.play(data, true).then(sound => {
            if (sound.failed) ui.notifications.warn('Unable to play: ' + data.src)
          })
        }
      }
    }

    xhr.send(null)
  }
}

class QuickDamageChatProcessor extends ChatProcessor {
  help() {
    return '/&lt;damage formula&gt;'
  }

  matches(line) {
    this.match = line.match(/^[./](.*?)( +[xX*]?(?<num>\d+))?$/)

    if (this.match) {
      this.action = parselink(this.match[1])

      return this.action?.action?.type === 'damage' || this.action?.action?.type === 'roll'
    }

    return false
  }
  async process(_line) {
    let event = {
      shiftKey: this.action.action.blindroll,
      data: {
        repeat: this.match.groups.num,
      },
    }

    await GURPS.performAction(this.action.action, GURPS.LastActor, event)
  }
}

class RefreshItemsChatProcessor extends ChatProcessor {
  help() {
    return null
  }

  matches(line) {
    this.match = line.match(/^\/refreshitems/i)

    return !!this.match
  }
  async process(_line) {
    ui.notifications.info('Starting Item refresh...')

    for (const actor of game.actors.contents) {
      console.log('Executing postImport() on ' + actor.name)
      await actor.postImport()
    }

    ui.notifications.info('Item refresh done.')
  }
}

class ForceMigrateChatProcessor extends ChatProcessor {
  help() {
    return null
  }

  matches(line) {
    this.match = line.match(/^\/forcemigrate/i)

    return !!this.match
  }
  async process(_line) {
    /*    await Migration.migrateTo096()
		await Migration.migrateTo097()
		await Migration.migrateTo0104()
		await Migration.fixDataModelProblems()
	*/
  }
}

class RolltableChatProcessor extends ChatProcessor {
  help() {
    return '/rolltable &lt;tablename&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/rolltable(.*)/)

    return !!this.match
  }

  async process(_line) {
    let tblname = this.match[1].trim()
    let pat = new RegExp(makeRegexPatternFrom(tblname, false), 'i')
    let tables = game.tables.contents.filter(table => table.name.match(pat))

    if (tables.length == 0) {
      ui.notifications.error("No table found for '" + tblname + "'")

      return false
    }

    if (tables.length > 1) {
      ui.notifications.error("More than one table matched '" + tblname + "'")

      return false
    }

    let table = tables[0]
    let roll = await table.roll()

    table.draw(roll)

    return true
  }
}

class WhisperChatProcessor extends ChatProcessor {
  help() {
    return '/w [players] <i>or</i> @'
  }
  matches(line) {
    this.match = line.match(/^\/w +@ +(.+)$/)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?]w$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpW')
  }
  process(_line) {
    let destTokens = Array.from(game.user.targets)

    if (destTokens.length == 0) destTokens = canvas.tokens.controlled
    if (destTokens.length == 0) return false
    let users = []

    for (const token of destTokens) {
      let owners = game.users.contents.filter(
        user => token.actor.getUserLevel(user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      )

      for (const user of owners) if (!user.isGM) users.push(user)
    }

    if (users.length == 0) return false
    this.registry.processLine('/w [' + users.map(user => user.name).join(',') + '] ' + this.match[1])
  }
}

class ReimportChatProcessor extends ChatProcessor {
  isGMOnly() {
    return true
  }
  help() {
    return '/reimport &lt;optional character names&gt;'
  }
  matches(line) {
    return line.startsWith('/reimport')
  }
  process(line) {
    this.priv(line)
    let actornames = line.replace(/^\/reimport/, '').trim()

    actornames = splitArgs(actornames)
    let allPlayerActors = game.actors.entities.filter(actor => actor.hasPlayerOwner)
    let actors = []

    for (const name of actornames) {
      let actor = allPlayerActors.find(actor => actor.name.match(makeRegexPattern(name, false)))

      if (actor) actors.push(actor)
    }

    if (actornames.length == 0) actors = allPlayerActors
    actors.forEach(actor => new ActorImporter(actor).importActor())
  }
}

class WaitChatProcessor extends ChatProcessor {
  help() {
    return '/wait &lt;milliseconds&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/wait +(\d+)/)

    return this.match
  }
  usagematches(line) {
    return line.match(/^[/?]wait$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpWait')
  }
  async process(line) {
    this.priv(line)
    await wait(+this.match[1])
  }
}

class SetEventFlagsChatProcessor extends ChatProcessor {
  help() {
    return null
  }
  matches(line) {
    return line.startsWith('/setEventFlags')
  }
  process(line) {
    let match = line.match(/\/setEventFlags (\w+) (\w+) (\w+)/)

    this.registry.setEventFlags(match[1] == 'true', match[2] == 'true', match[3] == 'true')
  }
}

class ClearMBsChatProcessor extends ChatProcessor {
  help() {
    return '/clearmb'
  }
  matches(line) {
    return line.startsWith('/clearmb')
  }
  process(line) {
    this.priv(line)
    GURPS.ModifierBucket.clear(!line.endsWith('no-update'))
  }
}

class ShowMBsChatProcessor extends ChatProcessor {
  help() {
    return '/showmbs'
  }
  matches(line) {
    return line === '/showmbs'
  }
  process(line) {
    this.priv(line)
    // TODO Go to ModifierBucket and use chat-processor.html there too
    setTimeout(() => GURPS.ModifierBucket.showOthers(), 1000) // Need time for clients to update...and
  }
}

class RollAgainstChatProcessor extends ChatProcessor {
  help() {
    return '/ra N | Skillname-N'
  }
  matches(line) {
    this.match = line.match(/^([./]p?ra) +([\w-'" ]+-)?(\d+)/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?.]p?ra$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpRa')
  }
  async process(line) {
    let match = this.match
    let skill = match[2] || 'Default='

    skill = skill.replace('-', '=') + match[3]
    if (skill.includes(' ')) skill = '"' + skill + '"'
    let action = parselink('S:' + skill)

    this.send() // send what we have
    await GURPS.performAction(action.action, GURPS.LastActor, {
      shiftKey: line.substr(1).startsWith('pra') || this.msgs().event?.shiftKey,
    })
  }
}

class MookChatProcessor extends ChatProcessor {
  isGMOnly() {
    return true
  }
  help() {
    return '/mook'
  }
  matches(line) {
    this.match = line.match(/^\/mook/i)

    return !!this.match
  }
  process(_line) {
    new NpcInput().render(true)
    this.priv('Opening Mook Generator')
  }
}

class ChatExecuteChatProcessor extends ChatProcessor {
  help = () => '/:&lt;macro name&gt args...'
  matches = line => line.startsWith('/:')

  splitArgs(line) {
    // Arguments to macros are of the form "name=value".  If the value contains spaces, it must be quoted.
    let args = []
    let inQuote = false
    let arg = ''

    for (let i = 0; i < line.length; i++) {
      let char = line[i]

      if (char == ' ' && !inQuote) {
        if (arg.length > 0) args.push(arg)
        arg = ''
      } else if (char == '"') {
        inQuote = !inQuote
      } else arg += char
    }

    if (arg.length > 0) args.push(arg)

    return args
  }

  async process(line) {
    GURPS.chatreturn = false
    let args = this.splitArgs(line.substr(2))

    console.log(args)
    GURPS.chatargs = args
    let macro = game.macros.find(macro => macro.name.startsWith(args[0]))

    if (macro) {
      this.send()
      // Old style macro arguments were just a list of strings, like ['foo', 'bar'].
      // New style macro arguments are an object with a name property for each argument, like { title: 'foo', text: 'bar' }.
      // Convert "x=a" style arguments to object style ({ x: 'a' }).
      let newArgs = {}

      args.slice(1).forEach(arg => {
        arg.split('=').forEach((value, i, arr) => {
          if (i == 0) newArgs[value] = arr[1]
        })
      })
      GURPS.chatreturn = await macro.execute(newArgs)

      // if (game.modules.get('advanced-macros')?.active) {
      //   // if Advanced macros is loaded, take advantage of the return value
      //   GURPS.chatreturn = (await m.execute({ args: [args] })) ?? GURPS.chatreturn
      // } else {
      //   m.execute({ args: [args] })
      // }
    } else this.priv(`${game.i18n.localize('GURPS.chatUnableToFindMacro')} '${line.substr(2)}'`)
    console.log(GURPS.chatreturn)

    return GURPS.chatreturn
  }
}

class SendMBChatProcessor extends ChatProcessor {
  isGMOnly() {
    return true
  }
  help() {
    return '/sendmb &lt;OtF&gt; &lt;playername(s)&gt;'
  }
  matches(line) {
    return line.startsWith('/sendmb')
  }
  process(line) {
    this.priv(line)
    let users = line.replace(/^\/sendmb/, '').trim()
    let match = users.match(/\[(.*)\](.*)/)

    if (match) {
      let otf = match[1]
      let result = parselink(otf)

      if (!!result.action && result.action.type == 'modifier') {
        GURPS.ModifierBucket.sendToPlayers(result.action, splitArgs(match[2]))

        return
      } else ui.notifications.warn(game.i18n.localize('GURPS.chatYouMayOnlySendMod'))
    } else GURPS.ModifierBucket.sendToPlayers(null, splitArgs(users))
  }
}

class FpHpChatProcessor extends ChatProcessor {
  help() {
    return '/fp (or /hp) &lt;formula&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/([fh]p) +([+-]\d+d\d*)?([+-=]\d+)?(!)?(reset)?(.*)/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?][fh]p$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpFpHp')
  }

  async process(line) {
    let match = this.match

    // TODO Consider relaxing the requirement to have a LastActor and if none provided, default to the player's token(s).
    // Maybe even popup the selectTarget dialog with all the players' tokens (if more than one) if no LastActor.
    let actor = GURPS.LastActor

    if (!actor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    if (match[6]?.trim().toLowerCase() == '@target') {
      let targets = Array.from(game.user.targets).map(target => target.id)

      if (targets.length == 0) {
        ui.notifications.warn(game.i18n.localize('GURPS.noTargetSelected'))

        return false
      }

      line = line.replace(/@target/gi, '')
      let remotes = []
      let locals = []

      targets.map(tid => {
        let ta = game.canvas.tokens.get(tid).actor
        let remote = false
        var any

        ta.getOwners().forEach(owner => {
          if (!owner.isGM && owner.active && !any) {
            remote = true
            any = owner
            remotes.push([owner.id, tid])
          }
        })
        if (!remote) locals.push(['', tid])
        this.priv(`${game.i18n.format('GURPS.chatSentTo', { cmd: line, name: ta.name })}`)
      })

      // Send the OtF to the target players.
      game.socket?.emit('system.gurps', {
        type: 'allowOtFExec',
        actorname: actor.name,
        targets: remotes,
        command: line,
      })

      return true
    }

    let attr = match[1].toUpperCase()
    let delta = parseInt(match[3])
    const max = actor.system[attr].max

    if (match[5]) {
      await actor.update({ ['system.' + attr + '.value']: max })
      this.prnt(`${actor.displayname} reset to ${max} ${attr}`)
    } else if (isNaN(delta) && !!match[3]) {
      // only happens with '='
      delta = parseInt(match[3].substr(1))

      if (isNaN(delta)) ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '${line}'`)
      else {
        let mtxt = ''

        if (delta > max) {
          delta = max
          mtxt = ` (max: ${max})`
        }

        await actor.update({ ['system.' + attr + '.value']: delta })
        this.prnt(`${actor.displayname} ${game.i18n.localize('GURPS.chatSetTo')} ${delta} ${attr}${mtxt}`)
      }
    } else if (!!match[2] || !!match[3]) {
      let mtxt = ''
      let mod = match[3] || ''

      delta = parseInt(mod)
      let dice = match[2] || ''
      let txt = ''

      if (dice) {
        let sign = dice[0] == '-' ? -1 : 1
        let diceMatch = dice.match(/[+-](\d+)d(\d*)/)
        let rollText = diceMatch[1] + 'd' + (diceMatch[2] ? diceMatch[2] : '6') + `[/${attr}]`
        let roll = Roll.create(rollText)

        await roll.evaluate()

        if (isNiceDiceEnabled()) {
          let throws = []
          let dc = []

          roll.dice.forEach(die => {
            let type = 'd' + die.faces

            die.results.forEach(result =>
              dc.push({
                result: result.result,
                resultLabel: result.result,
                type: type,
                vectors: [],
                options: {},
              })
            )
          })
          throws.push({ dice: dc })

          if (dc.length > 0) {
            // The user made a "multi-damage" roll... let them see the dice!
            // @ts-expect-error - dice3d is added by Dice So Nice module and not in core types
            game.dice3d.show({ throws: throws })
          }
        }

        delta = roll.total
        if (mod)
          if (isNaN(mod)) {
            ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '${line}'`)

            return
          } else delta += parseInt(mod)
        delta = Math.max(delta, match[4] ? 1 : 0)
        if (match[4]) mod += '!'
        delta *= sign
        txt = `(${delta}) `
      }

      delta += actor.system[attr].value

      if (delta > max) {
        delta = max
        mtxt = ` (max: ${max})`
      }

      await actor.update({ ['system.' + attr + '.value']: delta })
      this.prnt(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`)
    } else ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '${line}'`)
  }
}

class SelectChatProcessor extends ChatProcessor {
  help() {
    return '/select &lt;Actor name&gt'
  }
  matches(line) {
    this.match = line.match(/^\/(select|sel) ?(@self)?([^!]*)(!)?/)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^\?(select|sel)$/i) // can't match on /select since that is a valid command
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpSelect')
  }
  process(_line) {
    let match = this.match

    if (match[3] == '*') {
      canvas.activeLayer.controlAll()

      //for (let t of canvas.tokens.placeables) {t.control({ releaseOthers: false })}
      return true
    }

    if (match[2]) {
      // @self
      for (const actor of game.actors.contents) {
        let users = actor
          .getOwners()
          .filter(user => !user.isGM)
          .map(user => user.id)

        if (users.includes(game.user.id)) {
          let tokens = canvas.tokens.placeables.filter(token => token.actor == actor)

          if (tokens.length == 1) {
            tokens[0].control({ releaseOthers: true }) // Foundry 'select'
            GURPS.SetLastActor(actor, tokens[0].document)
          } else GURPS.SetLastActor(actor)
          this.priv('Selecting ' + actor.displayname)

          return
        }
      }
    } else if (!match[3]) {
      if (GURPS.LastActor) {
        let tokens = canvas.tokens.placeables.filter(token => token.actor == GURPS.LastActor)

        if (tokens.length == 1) tokens[0].release()
      }

      GURPS.ClearLastActor(GURPS.LastActor)
      this.priv(game.i18n.localize('GURPS.chatClearingLastActor'))
    } else {
      let pat = makeRegexPatternFrom(match[3])

      let list =
        game.scenes.viewed?.tokens.map(token => {
          // get the token's actor which might be a synthetic actor
          if (token.actor) return token.actor

          // otherwise, get the 'canonical' actor (non-synthetic)
          return game.actors.get(token.actorId)
        }) || []

      if (match[4]) list = game.actors.entities // ! means check all actors, not just ones on scene
      let actors = list.filter(actor => actor?.name?.match(pat))
      let msg =
        game.i18n.localize('GURPS.chatMoreThanOneActor') +
        " '" +
        match[3] +
        "': " +
        actors.map(actor => actor.name).join(', ')

      if (actors.length == 0 || actors.length > 1) {
        // No good match on actors, try token names
        actors = canvas.tokens.placeables.filter(token => token.name.match(pat))
        msg =
          game.i18n.localize('GURPS.chatMoreThanOneToken') +
          " '" +
          match[3] +
          "': " +
          actors.map(token => token.name).join(', ')
        actors = actors.map(token => token.actor)
      }

      if (actors.length == 0 || actors.length > 1) {
        // No good match on token names -- is this a token ID?
        actors = canvas.tokens.placeables.filter(token => token.id.match(pat))
        actors = actors.map(token => token.actor)
      }

      if (actors.length == 0)
        ui.notifications.warn(game.i18n.localize('GURPS.chatNoActorFound') + " '" + match[3] + "'")
      else if (actors.length > 1) ui.notifications.warn(msg)
      else {
        GURPS.SetLastActor(actors[0])
        let tokens = canvas.tokens.placeables.filter(token => token.actor == actors[0])

        if (tokens.length == 1) tokens[0].control({ releaseOthers: true }) // Foundry 'select'
        this.priv('Selecting ' + actors[0].displayname)
      }
    }
  }
}

class RollChatProcessor extends ChatProcessor {
  help() {
    return '/roll (or /r) [On-the-Fly formula]<br>/private (or /pr) [On-the-Fly formula] "Private"<br>/sr [On-the-Fly formula] "Selected Roll"<br>/psr [On-the-Fly formula] "Private Selected Roll"'
  }
  matches(line) {
    this.match = line.match(/^(\/roll|\/r|\/private|\/pr|\/sr|\/psr) \[(.+)\] *[xX*]?(\d+)?/)

    return !!this.match
  }
  async process(line) {
    let match = this.match
    let action = parselink(match[2])

    if (action.action) {
      if (action.action.type === 'modifier')
        // only need to show modifiers, everything else does something.
        this.priv(line)
      else this.send() // send what we have

      let actors = [GURPS.LastActor]

      if (line.startsWith('/psr') || line.startsWith('/sr'))
        actors = canvas.tokens?.controlled.map(token => token.actor)
      let atLeastOne = false

      let last = GURPS.LastActor

      action.action.overridetxt = this.msgs().event?.data?.overridetxt
      let ev = {
        shiftKey: line.startsWith('/p') || action.action.blindroll,
        ctrlKey: false,
        data: {
          repeat: match[3],
          overridetxt: action.action.overridetxt,
          private: line.startsWith('/p'),
        },
      }

      for (const actor of actors) {
        GURPS.LastActor = actor
        let result = await GURPS.performAction(action.action, actor, ev)

        GURPS.LastActor = last
        atLeastOne = atLeastOne || result
      }

      return atLeastOne
    } // Looks like a /roll OtF, but didn't parse as one
    else ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '[${match[2]}]'`)

    return false
  }
}

class UsesChatProcessor extends ChatProcessor {
  help() {
    return '/uses &lt;formula&gt; &lt;equipment name&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/uses +([+-=]\w+)?(reset)?(.*)/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?]uses$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpUses')
  }
  async process(line) {
    let answer = false
    let match = this.match
    let actor = GURPS.LastActor

    if (!actor) ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
    else {
      var eqt, key
      let m2 = match[3].trim().match(/^(o[.:])?(.*)/i)
      let pattern = m2[2].trim()

      if (pattern) [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      else if (this.msgs().event?.currentTarget) {
        pattern = '&lt;current equipment&gt;'
        let target = this.msgs().event?.currentTarget
        let tKey = $(target).closest('[data-key]').attr('data-key')

        // if we find a data-key, then we assume that we are on the character sheet, and if the target
        // is equipment, apply to that equipment.
        if (tKey) {
          key = tKey
          eqt = foundry.utils.getProperty(actor, key)
          // if its not equipment, ignore.
          if (eqt.count == null) eqt = null
        }
      }

      if (!eqt) ui.notifications.warn(game.i18n.localize('GURPS.chatNoEquipmentMatched') + " '" + pattern + "'")
      else {
        if (!match[1] && !match[2]) {
          // no +-= or reset
          ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '${line}'`)
        } else {
          eqt = foundry.utils.duplicate(eqt)
          let delta = parseInt(match[1])

          if (match[2]) {
            this.prnt(`${eqt.name} ${game.i18n.localize('GURPS.chatUsesReset')} (${eqt.maxuses})`)
            eqt.uses = eqt.maxuses
            await actor.update({ [key]: eqt })
            answer = true
          } else if (isNaN(delta)) {
            // only happens with '='
            delta = match[1].substr(1)
            eqt.uses = delta
            await actor.update({ [key]: eqt })
            this.prnt(`${eqt.name} ${game.i18n.localize('GURPS.chatUsesSet')} ${delta}`)
            answer = true
          } else {
            let value = parseInt(eqt.uses) + delta
            let max = parseInt(eqt.maxuses)

            if (isNaN(value)) ui.notifications.warn(eqt.name + ' ' + game.i18n.localize('GURPS.chatUsesIsNaN'))
            else if (value < 0)
              ui.notifications.warn(eqt.name + ' ' + game.i18n.localize('GURPS.chatDoesNotHaveEnough'))
            else if (!isNaN(max) && max > 0 && value > max)
              ui.notifications.warn(
                `${game.i18n.localize('GURPS.chatExceededMaxUses')} (${max}) ${game.i18n.localize('GURPS.for')} ` +
                  eqt.name
              )
            else {
              this.prnt(`${eqt.name} ${game.i18n.localize('GURPS.chatUses')} ${match[1]} = ${value}`)
              eqt.uses = value
              await actor.update({ [key]: eqt })
              answer = true
            }
          }
        }
      }
    }

    return answer
  }
}

class QtyChatProcessor extends ChatProcessor {
  help() {
    return '/qty &lt;formula&gt; &lt;equipment name&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/qty +([+-=] *\d+)(.*)/i)

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?]qty$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpQty')
  }
  async process(_line) {
    let answer = false
    let match = this.match
    let actor = GURPS.LastActor

    if (!actor) ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))
    else {
      var eqt, key
      let m2 = match[2].trim().match(/^(o[.:])?(.*)/i)
      let pattern = m2[2].trim()

      if (pattern) [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      else if (this.msgs().event?.currentTarget) {
        pattern = '&lt;current equipment&gt;'
        let target = this.msgs().event?.currentTarget
        let tKey = $(target).closest('[data-key]').attr('data-key')

        // if we find a data-key, then we assume that we are on the character sheet, and if the target
        // is equipment, apply to that equipment.
        if (tKey) {
          key = tKey
          eqt = foundry.utils.getProperty(actor, key)
          // if its not equipment, try to find equipment with that name
          if (eqt.count == null) [eqt, key] = actor.findEquipmentByName((pattern = eqt.name), !!m2[1])
        }
      }

      if (!eqt) ui.notifications.warn(game.i18n.localize('GURPS.chatNoEquipmentMatched') + " '" + pattern + "'")
      else {
        eqt = foundry.utils.duplicate(eqt)
        let delta = parseInt(match[1].replace(/ /g, ''))

        if (isNaN(delta)) {
          // only happens with '='
          delta = parseInt(match[1].substr(1).replace(/ /g, ''))

          if (isNaN(delta)) ui.notifications.warn(`${game.i18n.localize('GURPS.chatUnrecognizedFormat')} '${match[1]}'`)
          else {
            answer = true
            await actor.updateEqtCount(key, delta)
            this.prnt(`${eqt.name} ${game.i18n.localize('GURPS.chatQtySetTo')} ${delta}`)
          }
        } else {
          let value = parseInt(eqt.count) + delta

          if (value < 0)
            ui.notifications.warn(game.i18n.localize('GURPS.chatYouDoNotHaveEnough') + " '" + eqt.name + "'")
          else {
            answer = true
            this.prnt(`${eqt.name} ${game.i18n.localize('GURPS.chatQty')} ${match[1]}`)
            await actor.updateEqtCount(key, value)
          }
        }
      }
    }

    return answer
  }
}

class LightChatProcessor extends ChatProcessor {
  help() {
    return '/li &lt;dim dist&gt; &lt;bright dist&gt; &lt;angle&gt; &lt;anim&gt;|off '
  }
  matches(line) {
    // Could be this:
    // /^\/(light|li) *(?<off>none|off)? *(?<dim>\d+)? *(?<bright>\d+)? *(?<angle>\d+)? *(?<color>#[0-9a-fA-F]{6})? *(?<type>\w+)? *(?<speed>\d+)? *(?<intensity>\d+)?/i

    this.match = line.match(
      //      /^\/(light|li) *(none|off)? *(\d+)? *(\d+)? *(\d+)? *(#\w\w\w\w\w\w)? *(\w+)? *(\d+)? *(\d+)?/i
      /^\/(light|li) +(?<off>none|off)? *(?<dim>[\d.]+)? *(?<bright>[\d.]+)? *(?<angle>\d+)? *(?<color>#[0-9a-fA-F]{6})? *(?<colorint>[\d.]+)? *(?<type>\w+)? *(?<speed>\d+)? *(?<intensity>\d+)?/i
    )

    return !!this.match
  }
  usagematches(line) {
    return line.match(/^[/?](light|li)$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpLight')
  }
  async process(line) {
    if (canvas.tokens.controlled.length == 0) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return
    }

    if (line.match(/^\/(light|li) *$/)) {
      this.priv('Possible animations: ' + Object.keys(CONFIG.Canvas.lightAnimations).join(', '))

      return
    }

    let type = this.match.groups.type || ''

    if (type) {
      let pat = new RegExp(makeRegexPatternFrom(type, false), 'i')
      let match = Object.keys(CONFIG.Canvas.lightAnimations).find(key => key.match(pat))

      if (!match) {
        ui.notifications.warn(
          "Unknown light animation '" + type + "'.  Expected: " + Object.keys(CONFIG.Canvas.lightAnimations).join(', ')
        )

        return
      }

      type = match
    }

    let anim = {
      type: type,
      speed: parseFloat(this.match.groups.speed) || 1,
      intensity: parseFloat(this.match.groups.intensity) || 1,
    }
    let data = {
      light: {
        dim: 0,
        bright: 0,
        angle: 360,
        animation: anim,
      },
    }

    if (this.match.groups.off) {
      data.light['-=color'] = null
    } else {
      if (this.match.groups.color) data.light.color = this.match.groups.color
      if (this.match.groups.colorint) data.light.alpha = parseFloat(this.match.groups.colorint)
      data.light.dim = parseFloat(this.match.groups.dim || 0)
      data.light.bright = parseFloat(this.match.groups.bright || 0)
      data.light.angle = parseFloat(this.match.groups.angle || 360)
    }

    console.log('Token Light update: ' + GURPS.objToString(data))
    for (const token of canvas.tokens.controlled) await token.document.update(data)
    this.priv(line)
  }
}

class ShowChatProcessor extends ChatProcessor {
  isGMOnly() {
    return true
  }

  help() {
    return '/show (/showa) &lt;skills or attributes&gt'
  }

  matches(line) {
    this.match = line.match(/^\/(show|sh) (.*)/i)

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^[/?](show|sh)$/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpShow')
  }

  async process(line) {
    let args = splitArgs(this.match[2])

    this.priv(line)
    let alpha = false
    let pc = false
    let npc = false

    while (args[0].startsWith('-')) {
      if (args[0] == '-a') alpha = true
      if (args[0] == '-pc') pc = true
      if (args[0] == '-npc') npc = true
      args.shift()
    }

    for (const orig of args) {
      this.priv('<hr>')
      if (orig.toLowerCase() == 'move') this.priv('<b>Basic Move / Current Move</b>')
      if (orig.toLowerCase() == 'speed') this.priv('<b>Basic Speed</b>')
      if (orig.toLowerCase() == 'hp') this.priv('<b>Hit Points: Current / Max</b>')
      if (orig.toLowerCase() == 'fp') this.priv('<b>Fatigue Points: Current / Max</b>')
      let output = []

      for (const token of canvas.tokens.placeables) {
        let arg = orig
        let actor = token.actor
        let skip = (npc && actor.hasPlayerOwner) || (pc && !actor.hasPlayerOwner)

        if (!skip) {
          switch (orig.toLowerCase()) {
            case 'hp':
              output.push({
                value: actor.system.HP.value,
                text: `${actor.name}: ${actor.system.HP.value} / ${actor.system.HP.max}`,
                name: actor.name,
              })
              continue
            case 'fp':
              output.push({
                value: actor.system.FP.value,
                text: `${actor.name}: ${actor.system.FP.value} / ${actor.system.FP.max}`,
                name: actor.name,
              })
              continue
            case 'move':
              output.push({
                value: actor.system.currentmove,
                text: `${actor.name}: ${actor.system.basicmove.value} / ${actor.system.currentmove}`,
                name: actor.name,
              })
              continue
            case 'speed':
              output.push({
                value: actor.system.basicspeed.value,
                text: `${actor.name}: ${actor.system.basicspeed.value}`,
                name: actor.name,
              })
              continue
            case 'fright':
              arg = 'frightcheck'
              break
          }

          if (!GURPS.PARSELINK_MAPPINGS[arg.toUpperCase()]) {
            if (arg.includes(' ')) arg = '"' + arg + '"'
            arg = 'S:' + arg
          }

          let action = parselink(arg)

          if (action.action) {
            action.action.calcOnly = true
            let ret = await GURPS.performAction(action.action, actor)

            if (ret.target) {
              let lbl = `["${ret.thing} (${ret.target}) : ${actor.name}"!/sel ${token.id}\\\\/r [${arg}]]`

              output.push({ value: ret.target, text: lbl, name: actor.name })
              //this.priv(lbl)
            }
          }
        }
      }

      let sortfunc = (left, right) => {
        return left.value < right.value ? 1 : -1
      }

      if (alpha)
        sortfunc = (left, right) => {
          return left.name > right.name ? 1 : -1
        }

      output.sort(sortfunc).forEach(outputEntry => this.priv(outputEntry.text))
    }
  }
}

class DevChatProcessor extends ChatProcessor {
  isGMOnly() {
    return true
  }

  help() {
    return null
  }

  matches(line) {
    this.match = line.match(/^\/dev *(.*)/i)

    return !!this.match
  }
  async process(_line) {
    let match = this.match[1].match(/(\w+)(.*)/)

    switch (match ? match[1] : '') {
      case 'open': {
        // Open the full character sheet for an Actor
        let actor = game.actors.getName(match[2].trim())

        if (actor) actor.openSheet('gurps.GurpsActorSheet')
        else ui.notifications.warn("Can't find Actor named '" + match[2] + "'")
        break
      }
      case 'clear': {
        // flush the chat log without confirming
        game.messages.documentClass.deleteDocuments([], { deleteAll: true })
        break
      }
      case 'resetstatus': {
        for (let token of canvas.tokens.controlled) {
          console.log(`Checking ${token.name}`)
          const effect = token.actor.effects.contents

          for (let i = 0; i < effect.length; i++) {
            let condition = effect[i].label
            let status = effect[i].disabled
            let effect_id = effect[i]._id

            console.log(
              `Removing from ${token.name} condition: [${condition}] status: [${status}] effect_id: [${effect_id}]`
            )

            if (status === false) {
              try {
                await _token.actor.deleteEmbeddedDocuments('ActiveEffect', [effect_id])
              } catch (error) {
                console.log(error)
              }
            }
          }
        }

        break
      }

      default: {
        this.prnt('open &lt;name&gt;')
        this.prnt('clear')
        this.prnt('resetstatus')
      }
    }
  }
}

class ManeuverChatProcessor extends ChatProcessor {
  help() {
    return '/man &lt;maneuver&gt'
  }

  matches(line) {
    this.match = line.match(/^\/(maneuver|man) *(.*)/i)

    return !!this.match
  }

  async process(_line) {
    if (!this.match[2]) {
      this.priv(game.i18n.localize('GURPS.chatHelpManeuver'))
      Object.values(Maneuvers.getAll())
        .map(maneuver => game.i18n.localize(maneuver.data.label))
        .forEach(maneuverLabel => this.priv(maneuverLabel))

      return true
    }

    if (!game.combat) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatNotInCombat'))

      return false
    }

    let regex = makeRegexPatternFrom(this.match[2].toLowerCase(), false)
    let match = Object.values(Maneuvers.getAll()).find(maneuver =>
      game.i18n.localize(maneuver.data.label).toLowerCase().match(regex)
    )

    if (!GURPS.LastActor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    if (!match) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatUnableToFindManeuver') + " '" + this.match[2] + "'")

      return false
    }

    GURPS.LastActor.replaceManeuver(match._data.name)

    return true
  }
}

class RepeatChatProcessor extends ChatProcessor {
  help() {
    return '/repeat &lt;anim command&gt'
  }

  matches(line) {
    this.match = line.match(/^\/(repeat|rpt) +([\d.]+) *(.*)/i)

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^\/(repeat|rpt)/i)
  }
  usage() {
    return game.i18n.localize('GURPS.chatHelpRepeat')
  }

  async process(_line) {
    if (!GURPS.LastActor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    this.repeatLoop(GURPS.LastActor, this.match[3].trim(), this.match[2]) // We are purposefully NOT waiting for this method, so that it can continue in the background
  }
  async repeatLoop(actor, anim, delay) {
    if (delay < 20) delay = delay * 1000
    const token = canvas.tokens.placeables.find(placeableToken => placeableToken.actor == actor)

    if (!token) {
      ui.notifications.warn("/repeat only works on 'linked' actors, " + actor.name)

      return false
    }

    actor.RepeatAnimation = true

    while (actor.RepeatAnimation) {
      let pos = {
        x: token.position.x + token.w / 2,
        y: token.position.y + token.h / 2,
      }
      let command = anim + ' @' + pos.x + ',' + pos.y

      await GURPS.executeOTF(command)
      await GURPS.wait(delay)
    }

    ui.notifications.info('Stopped annimation for ' + actor.name)
  }
}

class StopChatProcessor extends ChatProcessor {
  help() {
    return '/stop'
  }

  matches(line) {
    this.match = line.match(/^\/stop/i)

    return !!this.match
  }

  async process(_line) {
    if (!GURPS.LastActor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    GURPS.LastActor.RepeatAnimation = false
  }
}

class DRChatProcessor extends ChatProcessor {
  help() {
    return escapeHtml('/dr <formula>|reset <hit locations>')
  }

  /**
   * Matches for the DR command.
   *
   * Basic use is `/dr <drFormula> <drLocations>` when:
   * - `drFormula` is a number, a math operation or `reset`
   * - `drLocations` is a comma separated list of hitlocations
   *
   * Examples:
   * - `/dr 2 eye,skull` - Set DR 2 to Eye and Skull hitlocations. Will sum Item bonuses.
   * - `/dr +2` - Add 2 to all hitlocations. Will sum Item bonuses.
   * - `/dr !2` - Force DR 2 to all hitlocations`
   * - `/dr *2 "left arm"` - Multiply 2 to Left Arm hitlocation
   * - `/dr /2` - Divide 2 to all hitlocations
   * - `/dr -2` - Subtract 2 to all hitlocations
   * - `/dr reset` - Reset all hitlocations to their original DR
   *
   * @param line
   * @returns {boolean}
   */
  matches(line) {
    this.match = line.match(/^\/(dr) +(reset|[+\-*/!]?\d+) *([\S\s,]*)?/)

    return !!this.match
  }

  usagematches(line) {
    return line.match(/^[/?]dr$/i)
  }

  usage() {
    return game.i18n.localize('GURPS.chatHelpDR')
  }

  /**
   * Process the DR command, updating the actor's hitlocations with the new DR value.
   *
   * `actor.system.hitlocations` example:
   *  {
   *   "00000": {
   *      "where": "Eye",
   *      "import": 0,  // DR from GCS/GCA import
   *      "equipment": "",
   *      "penalty": -9,
   *      "roll": "-"
   *    }
   *  }
   * One key per each hitlocation according to Actor's Body Plan
   * Damage Resistance (DR) is stored in a dynamic property called `dr`.
   *
   *
   * @param _line
   * @returns {Promise<void>}
   */
  async process(_line) {
    if (!GURPS.LastActor) {
      ui.notifications.error('No actor selected.')

      return
    }

    let drFormula = this.match[2]
    let drLocations = this.match[3] ? this.match[3].split(',').map(location => location.toLowerCase()) : []
    let actor = GURPS.LastActor

    const { msg = '', warn = '', info = '' } = await actor.changeDR(drFormula, drLocations)

    if (msg) await actor.sendChatMessage(msg)
    if (warn) ui.notifications.warn(warn)
    if (info) ui.notifications.info(info)
  }
}

class ModChatProcessor extends ChatProcessor {
  help() {
    return '/mod c|clear|&lt;OtF modifier&gt;'
  }

  matches(line) {
    this.match = line.match(/^\/mod *(clear|c)?(.*)/i)

    return !!this.match
  }

  async process(_line) {
    if (!GURPS.LastActor) {
      ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

      return false
    }

    let actor = GURPS.LastActor
    let uc = '(' + game.i18n.localize('GURPS.equipmentUserCreated') + ')'

    if (this.match[1]) {
      if (actor.system.conditions.usermods) {
        let mods = actor.system.conditions.usermods.filter(i => !i.endsWith(uc))

        actor.update({ 'system.conditions.usermods': mods }).then(() => GURPS.EffectModifierControl.refresh())
      }

      return true
    }

    let action = parselink(this.match[2].trim())

    if (action.action?.type == 'modifier') {
      let mods = actor.system.conditions.usermods ? [...actor.system.conditions.usermods] : []

      mods.push(action.action.orig + ' ' + uc)
      actor.update({ 'system.conditions.usermods': mods }).then(() => GURPS.EffectModifierControl.refresh())
    } else {
      this.prnt(actor.name + ' => ' + game.i18n.localize('GURPS.modifier'))
      actor.system.conditions.usermods?.forEach(mod => this.prnt(mod))
      //ui.notifications.warn(game.i18n.localize("GURPS.chatUnrecognizedFormat"))
    }

    return true
  }
}
