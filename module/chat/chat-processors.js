'use strict'

import ChatProcessor from './chat-processor.js'
import { ChatProcessors } from '../../module/chat.js'
import { parselink } from '../../lib/parselink.js'
import { NpcInput } from '../../lib/npc-input.js'
import { FrightCheckChatProcessor } from './frightcheck.js'
import {
  EveryoneAChatProcessor,
  EveryoneBChatProcessor,
  EveryoneCChatProcessor,
  RemoteChatProcessor,
} from './everything.js'
import { IfChatProcessor } from './if.js'
import { isNiceDiceEnabled, i18n, splitArgs, makeRegexPatternFrom } from '../../lib/utilities.js'
import StatusChatProcessor from '../chat/status.js'
import SlamChatProcessor from '../chat/slam.js'
import { Migration } from '../../lib/migration.js'

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
    let allPlayerActors = game.actors.entities.filter(a => a.hasPlayerOwner)
    let actors = []
    for (const name of actornames) {
      let actor = allPlayerActors.find(a => a.name.match(makeRegexPattern(name, false)))
      if (!!actor) actors.push(actor)
    }
    if (actornames.length == 0) actors = allPlayerActors
    actors.forEach(e => e.importCharacter())
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
    let m = line.match(/\/setEventFlags (\w+) (\w+)/)
    this.registry.setEventFlags(m[1] == 'true', m[2] == 'true')
  }
}

class ClearMBsChatProcessor extends ChatProcessor {
  help() {
    return '/clearmb'
  }
  matches(line) {
    return line === '/clearmb'
  }
  process(line) {
    this.priv(line)
    GURPS.ModifierBucket.clear()
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
    this.match = line.match(/^([\.\/]p?ra) +([\w-'" ]+-)?(\d+)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let skill = m[2] || 'Default='
    skill = skill.replace('-', '=') + m[3]
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
  process(line) {
    new NpcInput().render(true)
    this.priv('Opening Mook Generator')
  }
}

class ChatExecuteChatProcessor extends ChatProcessor {
  help() {
    return '/:&lt;macro name&gt'
  }
  matches(line) {
    return line.startsWith('/:')
  }
  process(line) {
    GURPS.chatreturn = false
    let args = splitArgs(line.substr(2))
    GURPS.chatargs = args
    let m = Object.values(game.macros.contents).filter(m => m.name.startsWith(args[0]))
    if (m.length > 0) {
      this.send()
      m[0].execute()
    } else this.priv(`${i18n('GURPS.chatUnableToFindMacro', 'Unable to find macro named')} '${line.substr(2)}'`)
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
    let m = users.match(/\[(.*)\](.*)/)
    if (!!m) {
      let otf = m[1]
      let t = parselink(otf)
      if (!!t.action && t.action.type == 'modifier') {
        GURPS.ModifierBucket.sendToPlayers(t.action, splitArgs(m[2]))
        return
      } else ui.notifications.warn(i18n('GURPS.chatYouMayOnlySendMod'))
    } else GURPS.ModifierBucket.sendToPlayers(null, splitArgs(users))
  }
}

class FpHpChatProcessor extends ChatProcessor {
  help() {
    return '/fp (or /hp) &lt;formula&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor)
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected', 'You must have a character selected'))
    else {
      let attr = m[1].toUpperCase()
      let delta = parseInt(m[3])
      const max = actor.data.data[attr].max
      let reset = ''
      if (!!m[5]) {
        await actor.update({ ['data.' + attr + '.value']: max })
        this.prnt(`${actor.displayname} reset to ${max} ${attr}`)
      } else if (isNaN(delta) && !!m[3]) {
        // only happens with '='
        delta = parseInt(m[3].substr(1))
        if (isNaN(delta))
          ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
        else {
          let mtxt = ''
          if (delta > max) {
            delta = max
            mtxt = ` (max: ${max})`
          }
          await actor.update({ ['data.' + attr + '.value']: delta })
          this.prnt(`${actor.displayname} ${i18n('GURPS.chatSetTo', 'set to')} ${delta} ${attr}${mtxt}`)
        }
      } else if (!!m[2] || !!m[3]) {
        let mtxt = ''
        let mod = m[3] || ''
        delta = parseInt(mod)
        let dice = m[2] || ''
        let txt = ''
        if (!!dice) {
          let sign = dice[0] == '-' ? -1 : 1
          let d = dice.match(/[+-](\d+)d(\d*)/)
          let r = d[1] + 'd' + (!!d[2] ? d[2] : '6')
          let roll = Roll.create(r).evaluate()
          if (isNiceDiceEnabled()) game.dice3d.showForRoll(roll, game.user, this.msgs().data.whisper)
          delta = roll.total
          if (!!mod)
            if (isNaN(mod)) {
              ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
              return
            } else delta += parseInt(mod)
          delta = Math.max(delta, !!m[4] ? 1 : 0)
          if (!!m[4]) mod += '!'
          delta *= sign
          txt = `(${delta}) `
        }
        delta += actor.data.data[attr].value
        if (delta > max) {
          delta = max
          mtxt = ` (max: ${max})`
        }
        await actor.update({ ['data.' + attr + '.value']: delta })
        this.prnt(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`)
      } else ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
    }
  }
}

class SelectChatProcessor extends ChatProcessor {
  help() {
    return '/select &lt;Actor name&gt'
  }
  matches(line) {
    this.match = line.match(/^\/(select|sel) ?(\@self)?([^!]*)(!)?/)
    return !!this.match
  }
  process(line) {
    let m = this.match
    if (!!m[2]) {
      // @self
      for (const a of game.actors.entities) {
        let users = a
          .getOwners()
          .filter(u => !u.isGM)
          .map(u => u.id)
        if (users.includes(game.user.id)) {
          GURPS.SetLastActor(a)
          let tokens = canvas.tokens.placeables.filter(t => t.actor == a)
          if (tokens.length == 1) tokens[0].control({ releaseOthers: true }) // Foundry 'select'
          this.priv('Selecting ' + a.displayname)
          return
        }
      }
    } else if (!m[3]) {
      if (!!GURPS.LastActor) {
        let tokens = canvas.tokens.placeables.filter(t => t.actor == GURPS.LastActor)
        if (tokens.length == 1) tokens[0].release()
      }
      GURPS.ClearLastActor(GURPS.LastActor)
      this.priv(i18n('GURPS.chatClearingLastActor', 'Clearing Last Actor'))
    } else {
      let pat = makeRegexPatternFrom(m[3])
      let list = game.scenes.viewed?.data.tokens.map(t => game.actors.get(t.actorId)) || []
      if (!!m[4]) list = game.actors.entities // ! means check all actors, not just ones on scene
      let a = list.filter(a => a?.name?.match(pat))
      let msg =
        i18n('GURPS.chatMoreThanOneActor', 'More than one Actor found matching') +
        " '" +
        m[3] +
        "': " +
        a.map(e => e.name).join(', ')
      if (a.length == 0 || a.length > 1) {
        // No good match on actors, try token names
        a = canvas.tokens.placeables.filter(t => t.name.match(pat))
        msg =
          i18n('GURPS.chatMoreThanOneToken', 'More than one Token found matching') +
          " '" +
          m[3] +
          "': " +
          a.map(e => e.name).join(', ')
        a = a.map(t => t.actor)
      }
      if (a.length == 0 || a.length > 1) {
        // No good match on token names -- is this a token ID?
        a = canvas.tokens.placeables.filter(t => t.id.match(pat))
        a = a.map(t => t.actor)
      }
      if (a.length == 0)
        ui.notifications.warn(i18n('GURPS.chatNoActorFound', 'No Actor/Token found matching') + " '" + m[3] + "'")
      else if (a.length > 1) ui.notifications.warn(msg)
      else {
        GURPS.SetLastActor(a[0])
        let tokens = canvas.tokens.placeables.filter(t => t.actor == a[0])
        if (tokens.length == 1) tokens[0].control({ releaseOthers: true }) // Foundry 'select'
        this.priv('Selecting ' + a[0].displayname)
      }
    }
  }
}

class RollChatProcessor extends ChatProcessor {
  help() {
    return '/roll (or /r) [On-the-Fly formula]'
  }
  matches(line) {
    this.match = line.match(/^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let action = parselink(m[2])
    if (!!action.action) {
      if (action.action.type === 'modifier')
        // only need to show modifiers, everything else does something.
        this.priv(line)
      else this.send() // send what we have
      await GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.startsWith('/pr') }) // We can't await this until we rewrite Modifiers.js to use sockets to update stacks
      return true
    } // Looks like a /roll OtF, but didn't parse as one
    else ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat')} '[${m[2]}]'`)
  }
}

class UsesChatProcessor extends ChatProcessor {
  help() {
    return '/uses &lt;formula&gt; &lt;equipment name&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/uses *([\+-=]\w+)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let answer = false
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
    else {
      var eqt, key
      let m2 = m[3].trim().match(/^(o[\.:])?(.*)/i)
      let pattern = m2[2].trim()
      if (!!pattern) [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      else if (this.msgs().event?.currentTarget) {
        pattern = '&lt;current equipment&gt;'
        let t = this.msgs().event?.currentTarget
        let k = $(t).closest('[data-key]').attr('data-key')
        // if we find a data-key, then we assume that we are on the character sheet, and if the target
        // is equipment, apply to that equipment.
        if (!!k) {
          key = k
          eqt = getProperty(actor.data, key)
          // if its not equipment, ignore.
          if (eqt.count == null) eqt = null
        }
      }
      if (!eqt)
        ui.notifications.warn(i18n('GURPS.chatNoEquipmentMatched', 'No equipment matched') + " '" + pattern + "'")
      else {
        if (!m[1]) {
          ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat')} '${line}'`)
        } else {
          eqt = duplicate(eqt)
          let delta = parseInt(m[1])
          if (!!m[2]) {
            this.prnt(`${eqt.name} ${i18n('GURPS.chatUsesReset', "'USES' reset to 'MAX USES'")} (${eqt.maxuses})`)
            eqt.uses = eqt.maxuses
            await actor.update({ [key]: eqt })
            answer = true
          } else if (isNaN(delta)) {
            // only happens with '='
            delta = m[1].substr(1)
            eqt.uses = delta
            await actor.update({ [key]: eqt })
            this.prnt(`${eqt.name} ${i18n('GURPS.chatUsesSet', "'USES' set to")} ${delta}`)
            answer = true
          } else {
            let q = parseInt(eqt.uses) + delta
            let max = parseInt(eqt.maxuses)
            if (isNaN(q)) ui.notifications.warn(eqt.name + ' ' + i18n('GURPS.chatUsesIsNaN', "'USES' is not a number"))
            else if (q < 0)
              ui.notifications.warn(eqt.name + ' ' + i18n('GURPS.chatDoesNotHaveEnough', "does not have enough 'USES'"))
            else if (!isNaN(max) && max > 0 && q > max)
              ui.notifications.warn(
                `${i18n('GURPS.chatExceededMaxUses', "Exceeded 'MAX USES'")} (${max}) ${i18n('GURPS.for')} ` + eqt.name
              )
            else {
              this.prnt(`${eqt.name} ${i18n('GURPS.chatUses', "'USES'")} ${m[1]} = ${q}`)
              eqt.uses = q
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
    this.match = line.match(/^\/qty *([\+-=]\d+)(.*)/i)
    return !!this.match
  }
  async process(line) {
    let answer = false
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
    else {
      var eqt, key
      let m2 = m[2].trim().match(/^(o[\.:])?(.*)/i)
      let pattern = m2[2].trim()
      if (!!pattern) [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      else if (this.msgs().event?.currentTarget) {
        pattern = '&lt;current equipment&gt;'
        let t = this.msgs().event?.currentTarget
        let k = $(t).closest('[data-key]').attr('data-key')
        // if we find a data-key, then we assume that we are on the character sheet, and if the target
        // is equipment, apply to that equipment.
        if (!!k) {
          key = k
          eqt = getProperty(actor.data, key)
          // if its not equipment, ignore.
          if (eqt.count == null) eqt = null
        }
      }
      if (!eqt)
        ui.notifications.warn(i18n('GURPS.chatNoEquipmentMatched', 'No equipment matched') + " '" + pattern + "'")
      else {
        eqt = duplicate(eqt)
        let delta = parseInt(m[1])
        if (isNaN(delta)) {
          // only happens with '='
          delta = parseInt(m[1].substr(1))
          if (isNaN(delta))
            ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${m[1]}'`)
          else {
            answer = true
            await actor.updateEqtCount(key, delta)
            this.prnt(`${eqt.name} ${i18n('GURPS.chatQtySetTo', "'QTY' set to")} ${delta}`)
          }
        } else {
          let q = parseInt(eqt.count) + delta
          if (q < 0)
            ui.notifications.warn(
              i18n('GURPS.chatYouDoNotHaveEnough', 'You do not have enough') + " '" + eqt.name + "'"
            )
          else {
            answer = true
            this.prnt(`${eqt.name} ${i18n('GURPS.chatQty', "'QTY'")} ${m[1]}`)
            await actor.updateEqtCount(key, q)
          }
        }
      }
    }
    return answer
  }
}

class TrackerChatProcessor extends ChatProcessor {
  help() {
    return '/tr&lt;N&gt; (or /tr (&lt;name&gt;)) &lt;formula&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/(tracker|tr|rt|resource)([0123])?( *\(([^\)]+)\))? *([+-=]\d+)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let answer = false
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
      return
    }

    let tracker = parseInt(m[2])
    let display = tracker

    // find tracker
    if (!!m[3]) {
      let pattern = '^' + m[3].trim()
      tracker = -1
      for (const [key, value] of Object.entries(actor.data.data.additionalresources.tracker)) {
        if (value.name.match(pattern)) {
          tracker = key
          display = '(' + value.name + ')'
        }
      }
      if (tracker == -1) {
        ui.notifications.warn(`${i18n('GURPS.chatNoResourceTracker', 'No Resource Tracker matched')} '${m[3]}'`)
        return
      }
    }

    if (!m[5]) {
      ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
      return
    }

    let delta = parseInt(m[5])

    let theTracker = actor.data.data.additionalresources.tracker[tracker]

    if (!!m[6]) {
      // reset -- Damage Tracker's reset to zero
      let value = !!theTracker.isDamageTracker ? theTracker.min : theTracker.max
      //if (!!theTracker.isDamageTracker) max = 0
      await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
      this.prnt(
        `${i18n('GURPS.chatResourceTracker', 'Resource Tracker')}${display} ${i18n(
          'GURPS.chatResetTo',
          'reset to'
        )} ${value}`
      )
      answer = true
    } else if (isNaN(delta)) {
      // only happens with '='
      let value = parseInt(m[5].substr(1))
      if (isNaN(value))
        ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
      else {
        value = this.getRestrictedValue(theTracker)

        await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
        this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} set to ${value}`)
        answer = true
      }
    } else if (!!m[5]) {
      let max = theTracker.max == 0 ? Number.MAX_SAFE_INTEGER : theTracker.max
      let value = this.getRestrictedValue(theTracker, theTracker.value + delta)

      if (value > max) {
        // This only happens if the value exceeds max, but Maximum is NOT enforced for this tracker.
        // Allow it, but give the user a warning.
        ui.notifications.warn(
          `${i18n('GURPS.chatExceededMax', 'Exceeded MAX')}:${max} ${i18n('GURPS.for')} ${i18n(
            'GURPS.chatResourceTracker'
          )}${display}`
        )
        // Allow it: value = max
      }
      if (!!theTracker.isDamageTracker && value < 0) {
        // This only happens if the value is under min, but Minimum is NOT enforced for this tracker.
        // Allow it, but give the user a warning.
        ui.notifications.warn(
          `${i18n('GURPS.chatResultBelowZero', 'Result below zero')}: ${i18n('GURPS.chatResourceTracker')}${display}`
        )
        // Allow it: value = 0
      }
      await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: value })
      this.prnt(`${i18n('GURPS.chatResourceTracker')}${display} ${m[5]} = ${value}`)
      answer = value >= 0
    } else ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)

    return answer
  }

  getRestrictedValue(theTracker, value) {
    value = theTracker.isMaximumEnforced && value > theTracker.max ? theTracker.max : value
    value = theTracker.isMinimumEnforced && value < theTracker.min ? theTracker.min : value
    return value
  }
}

class LightChatProcessor extends ChatProcessor {
  help() {
    return '/li &lt;dim dist&gt; &lt;bright dist&gt; &lt;angle&gt; &lt;anim&gt;|off '
  }
  matches(line) {
    this.match = line.match(
      /^\/(light|li) *(none|off)? *(\d+)? *(\d+)? *(\d+)? *(#\w\w\w\w\w\w)? *(\w+)? *(\d+)? *(\d+)?/i
    )
    return !!this.match
  }
  async process(line) {
    if (canvas.tokens.controlled.length == 0) {
      ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected'))
      return
    }
    if (line.match(/^\/(light|li) *$/)) {
      this.priv('Possible animations: ' + Object.keys(CONFIG.Canvas.lightAnimations).join(', '))
      return
    }
    let type = this.match[7] || ''
    if (!!type) {
      let m = Object.keys(CONFIG.Canvas.lightAnimations).find(k => k.startsWith(type))
      if (!m) {
        ui.notifications.warn(
          "Unknown light animation '" + type + "'.  Expected: " + Object.keys(CONFIG.Canvas.lightAnimations).join(', ')
        )
        return
      }
      type = m
    }
    let anim = { type: type, speed: parseInt(this.match[8]) || 1, intensity: parseInt(this.match[9]) || 1 }
    let data = {
      dimLight: 0,
      brightLight: 0,
      lightAngle: 360,
      lightAnimation: anim,
      '-=lightColor': null,
    }

    if (!this.match[2]) {
      if (this.match[6]) data.lightColor = this.match[6]
      data.dimLight = parseInt(this.match[3] || 0)
      data.brightLight = parseInt(this.match[4] || 0)
      data.lightAngle = parseInt(this.match[5] || 360)
    }
    for (const t of canvas.tokens.controlled) await t.document.update(data)
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
  async process(line) {
    await Migration.migrateTo096()
    await Migration.migrateTo097()
  }
}
