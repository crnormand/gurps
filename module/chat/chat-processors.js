'use strict'

import { ChatProcessors, ChatProcessor } from '../../module/chat.js'
import { parselink } from '../../lib/parselink.js'
import { NpcInput } from '../../lib/npc-input.js'
import { Equipment } from '../actor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { isNiceDiceEnabled } from '../../lib/utilities.js'
import { FrightCheckChatProcessor } from './frightcheck.js'
import { EveryoneAChatProcessor, EveryoneBChatProcessor, EveryoneCChatProcessor } from './everything.js'
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
    ChatProcessors.registerProcessor(new StatusProcessor())
    ChatProcessors.registerProcessor(new FrightCheckChatProcessor())
    ChatProcessors.registerProcessor(new UsesChatProcessor())
    ChatProcessors.registerProcessor(new FpHpChatProcessor())
    ChatProcessors.registerProcessor(new SendMBChatProcessor())
    ChatProcessors.registerProcessor(new ChatExecuteChatProcessor())
    ChatProcessors.registerProcessor(new TrackerChatProcessor())
    ChatProcessors.registerProcessor(new IfChatProcessor())
}

class ClearMBsChatProcessor extends ChatProcessor {
  help() { return "/clearmb" }
  matches(line) {
    return line === '/clearmb'
  }
  process(line, msgs) {
    this.priv(line, msgs)
    GURPS.ModifierBucket.clear()
  }
}

class ShowMBsChatProcessor extends ChatProcessor {
  help() { return "/showmbs" }
  matches(line) {
    return line === '/showmbs'
  }
  process(line, msgs) {
    this.priv(line, msgs)
    setTimeout(() => GURPS.ModifierBucket.showOthers(), 1000) // Need time for clients to update...and
  }
}

class RollAgainstChatProcessor extends ChatProcessor {
  help() { return "/ra N | Skillname-N" }
  matches(line) {
    this.match = line.match(/([\.\/]p?ra) +(\w+-)?(\d+)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match
    let skill = m[2] || 'Default='
    let action = parselink('S:' + skill.replace('-', '=') + m[3])
    this.send(msgs) // send what we have
    GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.substr(1).startsWith('pra') }) 
  }
}

class MookChatProcessor extends ChatProcessor {
  isGMOnly() { return true }
  help() { return "/mook" }
  matches(line) {
    this.match = line.match(/\/mook/i)
    return !!this.match
  }
  process(line, msgs) {
    new NpcInput().render(true)
    this.priv('Opening Mook Generator', msgs)
  }
}

class ChatExecuteChatProcessor extends ChatProcessor {
  help() { return "/:&lt;macro name&gt" }
  matches(line) {
    return line.startsWith('/:')
  }
  process(line, msgs) {
    let m = Object.values(game.macros.entries).filter(m => m.name.startsWith(line.substr(2)))
    if (m.length > 0) {
      this.send(msgs)
      m[0].execute()
    } else 
      this.priv(`Unable to find macro named '${line.substr(2)}'`, msgs)
  }
}

class SendMBChatProcessor extends ChatProcessor {
  isGMOnly() { return true }
  help() { return "/sendmb &lt;OtF&gt; &lt;playername(s)&gt;" }
  matches(line) {
    return line.startsWith('/sendmb')
  }
  process(line, msgs) {
    this.priv(line, msgs)
    let user = line.replace(/\/sendmb/, '').trim()
    let m = user.match(/\[(.*)\](.*)/)
    if (!!m) {
      let otf = m[1]
      let t = parselink(otf)
      if (!!t.action && t.action.type == 'modifier') {
        GURPS.ModifierBucket.sendToPlayer(t.action, m[2].trim())
        return
      }
    }
    GURPS.ModifierBucket.sendBucketToPlayer(user)
  } 
}


class FpHpChatProcessor extends ChatProcessor {
  help() { return "/fp (or /hp) &lt;formula&gt;" }
  matches(line) {
    this.match = line.match(/\/([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?(reset)?(.*)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn('You must have a character selected')
    else {
      let attr = m[1].toUpperCase()
      let delta = parseInt(m[3])
      const max = actor.data.data[attr].max
      let reset = ''
      if (!!m[5]) {
        actor.update({ ['data.' + attr + '.value']: max })
        this.prnt(`${actor.displayname} reset to ${max} ${attr}`, msgs)
      } else if (isNaN(delta) && !!m[3]) {
        // only happens with '='
        delta = parseInt(m[3].substr(1))
        if (isNaN(delta)) ui.notifications.warn(`Unrecognized format for '${line}'`)
        else {
          let mtxt = ''
          if (delta > max) {
            delta = max
            mtxt = ` (max: ${max})`
          }
          actor.update({ ['data.' + attr + '.value']: delta })
          this.prnt(`${actor.displayname} set to ${delta} ${attr}${mtxt}`, msgs)
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
          if (isNiceDiceEnabled()) game.dice3d.showForRoll(roll, game.user, data.whisper)
          delta = roll.total
          if (!!mod)
            if (isNaN(mod)) {
              ui.notifications.warn(`Unrecognized format '${line}'`)
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
        actor.update({ ['data.' + attr + '.value']: delta })
        this.prnt(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
      } else ui.notifications.warn(`Unrecognized format for '${line}'`)
    }
  }
}


class SelectChatProcessor extends ChatProcessor {
  help() { return "/select &lt;Actor name&gt" }
  matches(line) {
    this.match = line.match(/\/(select|sel) ?([^!]*)(!)?/)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match
    if (!m[2]) {
      GURPS.ClearLastActor(GURPS.LastActor)
      this.priv('Clearing Last Actor', msgs)
    } else {
      let pat = m[2].split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)') // Make string into a RegEx pattern
      pat = '^' + pat.trim() + '$'
      let list = game.scenes.viewed?.data.tokens.map(t => game.actors.get(t.actorId)) || []
      if (!!m[3]) list = game.actors.entities
      let a = list.filter(a => a?.name?.match(pat))
      let msg = "More than one Actor found matching '" + m[2] + "': " + a.map(e => e.name).join(', ')
      if (a.length == 0 || a.length > 1) {
        // No good match on actors, try token names
        a = canvas.tokens.placeables.filter(t => t.name.match(pat))
        msg = "More than one Token found matching '" + m[2] + "': " + a.map(e => e.name).join(', ')
        a = a.map(t => t.actor)
      }
      if (a.length == 0) ui.notifications.warn("No Actor/Token found matching '" + m[2] + "'")
      else if (a.length > 1) ui.notifications.warn(msg)
      else {
        GURPS.SetLastActor(a[0])
        this.priv('Selecting ' + a[0].displayname, msgs)
      }
    }
  }
}


class RollChatProcessor extends ChatProcessor {
  help() { return '/roll (or /r) [On-the-Fly formula]' }   
  matches(line) {
    this.match = line.match(/^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let action = parselink(m[2])
    if (!!action.action) {
      if (action.action.type === 'modifier')
        // only need to show modifiers, everything else does something.
        this.priv(line, msgs)
      else this.send(msgs) // send what we have
      GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.startsWith('/pr') }) // We can't await this until we rewrite Modifiers.js to use sockets to update stacks
      return true
    } else  // Looks like a /roll OtF, but didn't parse as one
     ui.notifications.warn(`Unrecognized On-the-Fly formula '[${m[2]}]'`)
  }
}       

class UsesChatProcessor extends ChatProcessor {
  help() { return '/uses &lt;formula&gt; &lt;equipment name&gt;' }   
  matches(line) {
    this.match = line.match(/\/uses *([\+-=]\w+)?(reset)?(.*)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn('You must have a character selected')
    else {
      let pattern = m[3].trim()
      let [eqt, key] = actor.findEquipmentByName(pattern)
      if (!eqt) ui.notifications.warn("No equipment matched '" + pattern + "'")
      else {
        eqt = duplicate(eqt)
        let delta = parseInt(m[1])
        if (!!m[2]) {
          this.prnt(`${pattern} USES reset to MAX USES (${eqt.maxuses})`, msgs)
          eqt.uses = eqt.maxuses
          actor.update({ [key]: eqt })
        } else if (isNaN(delta)) {
          // only happens with '='
          delta = m[1].substr(1)
          eqt.uses = delta
          actor.update({ [key]: eqt })
          this.prnt(`${pattern} USES set to ${delta}`, msgs)
        } else {
          let q = parseInt(eqt.uses) + delta
          let max = parseInt(eqt.maxuses)
          if (isNaN(q)) ui.notifications.warn(eqt.name + " 'uses' is not a number")
          else if (q < 0) ui.notifications.warn(eqt.name + ' does not have enough USES')
          else if (!isNaN(max) && max > 0 && q > max)
            ui.notifications.warn(`Exceeded max uses (${max}) for ` + eqt.name)
          else {
            this.prnt(`${pattern} USES ${m[1]} = ${q}`, msgs)
            eqt.uses = q
            actor.update({ [key]: eqt })
          }
        }
      }
    }
  }
}


class QtyChatProcessor extends ChatProcessor {
  help() { return '/qty &lt;formula&gt; &lt;equipment name&gt;' }   
  matches(line) {
    this.match == line.match(/\/qty *([\+-=]\d+)(.*)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn('You must have a character selected')
    else {
      let m2 = m[2].trim().match(/^(o[\.:])?(.*)/i)
      let pattern = m2[2]
      let [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      if (!eqt) ui.notifications.warn("No equipment matched '" + pattern + "'")
      else {
        eqt = duplicate(eqt)
        let delta = parseInt(m[1])
        if (isNaN(delta)) {
          // only happens with '='
          delta = parseInt(m[1].substr(1))
          if (isNaN(delta)) ui.notifications.warn(`Unrecognized format '${m[1]}'`)
          else {
            eqt.count = delta
            actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
            this.prnt(`${pattern} set to ${delta}`, msgs)
          }
        } else {
          let q = parseInt(eqt.count) + delta
          if (q < 0) ui.notifications.warn("You do not have enough '" + eqt.name + "'")
          else {
            this.prnt(`${pattern} QTY ${m[1]}`, msgs)
            eqt.count = q
            actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
          }
        }
      }
    }
  }
}


class TrackerChatProcessor extends ChatProcessor {
  help() { return '/tr&lt;N&gt; (or /tr &lt;name&gt;) &lt;formula&gt;' }   
  matches(line) {
    this.match = line.match(/\/(tracker|tr|rt|resource)([0123])?(\(([^\)]+)\))? *([+-=]\d+)?(reset)?(.*)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn('You must have a character selected')
    else {
      let tracker = parseInt(m[2])
      let display = tracker
      if (!!m[3]) {
        tracker = -1
        for (const [key, value] of Object.entries(actor.data.data.additionalresources.tracker)) {
          if (value.name.match(m[4])) {
            tracker = key
            display = '(' + value.name + ')'
          }
        }
        if (tracker == -1) {
          ui.notifications.warn(`No Resource Tracker matched '${m[3]}'`)
          return
        }
      }
      let delta = parseInt(m[5])
      let reset = ''
      let max = actor.data.data.additionalresources.tracker[tracker].max
      if (!!m[6]) {
        actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: max })
        this.prnt(`Resource Tracker${display} reset to ${max}`, msgs)
      } else if (isNaN(delta)) {
        // only happens with '='
        delta = parseInt(m[5].substr(1))
        if (isNaN(delta)) ui.notifications.warn(`Unrecognized format for '${line}'`)
        else {
          actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: delta })
          this.prnt(`Resource Tracker${display} set to ${delta}`, msgs)
        }
      } else if (!!m[5]) {
        if (max == 0) max = Number.MAX_SAFE_INTEGER
        let v = actor.data.data.additionalresources.tracker[tracker].value + delta
        if (v > max) {
          ui.notifications.warn(`Exceeded MAX:${max} for Resource Tracker${tracker}`)
          v = max
        }
        actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: v })
        this.prnt(`Resource Tracker${display} ${m[5]} = ${v}`, msgs)
      } else ui.notifications.warn(`Unrecognized format for '${line}'`)
    }
  }
}

 
          
class StatusProcessor extends ChatProcessor {
  help() { return '/status on|off|t|toggle|clear &lt;status&gt;' }   
  matches(line) {
    this.match = line.match(/\/(st|status) +(t|toggle|on|off|\+|-|clear|set|unset) *([^\@ ]+)? *(\@self)?/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let pattern = !m[3]
      ? '.*'
      : new RegExp('^' + m[3].trim().split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)'), 'i') // Make string into a RegEx pattern
    let any = false
    let on = false
    let set = m[2].toLowerCase() == 'on' || m[2] == '+' || m[2] == 'set'
    let toggle = m[2].toLowerCase() == 't' || m[2].toLowerCase() == 'toggle'
    let clear = m[2].toLowerCase() == 'clear'
    var effect, msg
    Object.values(CONFIG.statusEffects).forEach(s => {
      let nm = game.i18n.localize(s.label)
      if (nm.match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
    })
    if (!effect) ui.notifications.warn("No status matched '" + pattern + "'")
    else if (!!m[4]) {
      if (!!GURPS.LastActor) {
        let tokens = !!GURPS.LastActor.token ? [GURPS.LastActor.token] : GURPS.LastActor.getActiveTokens()
        if (tokens.length == 0)
          msg = 'Your character does not have any tokens.   We require a token to set statuses'
        else {
          any = true
          GURPS.LastActor.effects.forEach(e => {
            if (clear)
              Object.values(CONFIG.statusEffects).forEach(s => {
                if (s.id == e.getFlag('core', 'statusId')) {
                  tokens[0].toggleEffect(s)
                  this.prnt(`Clearing ${e.data.label} for ${GURPS.LastActor.displayname}`, msgs)
                }
              })
            else if (effect.id == e.getFlag('core', 'statusId')) on = true
          })
          if (on & !set || (!on && set) || toggle) {
            this.prnt(`Toggling ${game.i18n.localize(effect.label)} for ${GURPS.LastActor.displayname}`, msgs)
            tokens[0].toggleEffect(effect)
          }
        }
      } else msg = 'You must select a character to apply status effects'
    } else {
      msg = 'You must select tokens (or use @self) to apply status effects'
      canvas.tokens.controlled.forEach(t => {
        any = true
        if (!!t.actor)
          t.actor.effects.forEach(e => {
            if (clear)
              Object.values(CONFIG.statusEffects).forEach(s => {
                if (s.id == e.getFlag('core', 'statusId')) {
                  t.toggleEffect(s)
                  this.prnt(`Clearing ${e.data.label} for ${t.actor.displayname}`, msgs)
                }
              })
            else if (effect.id == e.getFlag('core', 'statusId')) on = true
          })
        if (on & !set || (!on && set) || toggle) {
          this.prnt(`Toggling ${game.i18n.localize(effect.label)} for ${t.actor.displayname}`, msgs)
          t.toggleEffect(effect)
        }
      })
    }
    if (!any) ui.notifications.warn(msg)
  }
}
