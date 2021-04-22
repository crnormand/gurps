'use strict'

import { ChatProcessors, ChatProcessor } from '../../module/chat.js'
import { parselink } from '../../lib/parselink.js'
import { NpcInput } from '../../lib/npc-input.js'
import { Equipment } from '../actor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { FrightCheckChatProcessor } from './frightcheck.js'
import { EveryoneAChatProcessor, EveryoneBChatProcessor, EveryoneCChatProcessor, RemoteChatProcessor } from './everything.js'
import { IfChatProcessor } from './if.js'
import { isNiceDiceEnabled, i18n } from '../../lib/utilities.js'

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
    ChatProcessors.registerProcessor(new QtyChatProcessor())
    ChatProcessors.registerProcessor(new FpHpChatProcessor())
    ChatProcessors.registerProcessor(new SendMBChatProcessor())
    ChatProcessors.registerProcessor(new ChatExecuteChatProcessor())
    ChatProcessors.registerProcessor(new TrackerChatProcessor())
    ChatProcessors.registerProcessor(new IfChatProcessor())
    ChatProcessors.registerProcessor(new SetWhisperChatProcessor())
    ChatProcessors.registerProcessor(new RemoteChatProcessor())
}

class SetWhisperChatProcessor extends ChatProcessor {
  help() { return null }
  matches(line) {
    return line === '/setwhisper'
  }
  process(line) {
    this.registry.setWhisper()
  }
}

class ClearMBsChatProcessor extends ChatProcessor {
  help() { return "/clearmb" }
  matches(line) {
    return line === '/clearmb'
  }
  process(line) {
    this.priv(line)
    GURPS.ModifierBucket.clear()
  }
}

class ShowMBsChatProcessor extends ChatProcessor {
  help() { return "/showmbs" }
  matches(line) {
    return line === '/showmbs'
  }
  process(line) {
    this.priv(line)
    setTimeout(() => GURPS.ModifierBucket.showOthers(), 1000) // Need time for clients to update...and
  }
}

class RollAgainstChatProcessor extends ChatProcessor {
  help() { return "/ra N | Skillname-N" }
  matches(line) {
    this.match = line.match(/^([\.\/]p?ra) +(\w+-)?(\d+)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let skill = m[2] || 'Default='
    let action = parselink('S:' + skill.replace('-', '=') + m[3])
    this.send() // send what we have
    await GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.substr(1).startsWith('pra') || this.msgs().event?.shiftKey }) 
  }
}

class MookChatProcessor extends ChatProcessor {
  isGMOnly() { return true }
  help() { return "/mook" }
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
  help() { return "/:&lt;macro name&gt" }
  matches(line) {
    return line.startsWith('/:')
  }
  process(line) {
    let m = Object.values(game.macros.entries).filter(m => m.name.startsWith(line.substr(2)))
    if (m.length > 0) {
      this.send()
      m[0].execute()
    } else 
      this.priv(`${i18n("GURPS.chatUnableToFindMacro", 'Unable to find macro named')} '${line.substr(2)}'`)
  }
}

class SendMBChatProcessor extends ChatProcessor {
  isGMOnly() { return true }
  help() { return "/sendmb &lt;OtF&gt; &lt;playername(s)&gt;" }
  matches(line) {
    return line.startsWith('/sendmb')
  }
  process(line) {
    this.priv(line)
    let user = line.replace(/^\/sendmb/, '').trim()
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
    this.match = line.match(/^\/([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n('GURPS.chatYouMustHaveACharacterSelected', 'You must have a character selected'))
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
        if (isNaN(delta)) ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
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
  help() { return "/select &lt;Actor name&gt" }
  matches(line) {
    this.match = line.match(/^\/(select|sel) ?(\@self)?([^!]*)(!)?/)
    return !!this.match
  }
  process(line) {
    let m = this.match
    if (!!m[2]) { // @self
      for (const a of game.actors.entities) {
      
        let users = a.getUsers(CONST.ENTITY_PERMISSIONS.OWNER, true).filter(u => !u.isGM).map(u => u.id)
        if (users.includes(game.user.id)) {
          GURPS.SetLastActor(a)
          this.priv('Selecting ' + a.displayname)
          return
        }
      }
    } else if (!m[3]) {
      GURPS.ClearLastActor(GURPS.LastActor)
      this.priv(i18n('GURPS.chatClearingLastActor', 'Clearing Last Actor'))
    } else {
      let pat = m[3].split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)') // Make string into a RegEx pattern
      pat = '^' + pat.trim() + '$'
      let list = game.scenes.viewed?.data.tokens.map(t => game.actors.get(t.actorId)) || []
      if (!!m[4]) list = game.actors.entities // ! means check all actors, not just ones on scene
      let a = list.filter(a => a?.name?.match(pat))
      let msg = i18n("GURPS.chatMoreThanOneActor", "More than one Actor found matching") + " '" + m[3] + "': " + a.map(e => e.name).join(', ')
      if (a.length == 0 || a.length > 1) {
        // No good match on actors, try token names
        a = canvas.tokens.placeables.filter(t => t.name.match(pat))
        msg = i18n("GURPS.chatMoreThanOneToken", "More than one Token found matching") + " '" + m[3] + "': " + a.map(e => e.name).join(', ')
        a = a.map(t => t.actor)
      }
      if (a.length == 0) ui.notifications.warn(i18n("GURPS.chatNoActorFound", "No Actor/Token found matching") + " '" + m[3] + "'")
      else if (a.length > 1) ui.notifications.warn(msg)
      else {
        GURPS.SetLastActor(a[0])
        this.priv('Selecting ' + a[0].displayname)
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
    } else  // Looks like a /roll OtF, but didn't parse as one
     ui.notifications.warn(`${i18n("GURPS.chatUnrecognizedFormat")} '[${m[2]}]'`)
  }
}       

class UsesChatProcessor extends ChatProcessor {
  help() { return '/uses &lt;formula&gt; &lt;equipment name&gt;' }   
  matches(line) {
    this.match = line.match(/^\/uses *([\+-=]\w+)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n("GURPS.chatYouMustHaveACharacterSelected"))
    else {
      let pattern = m[3].trim()
      let [eqt, key] = actor.findEquipmentByName(pattern)
      if (!eqt) ui.notifications.warn(i18n("GURPS.chatNoEquipmentMatched", "No equipment matched") + " '" + pattern + "'")
      else {
        if (!m[1]) {
          ui.notifications.warn(`${i18n("GURPS.chatUnrecognizedFormat")} '${line}'`)
        } else {
          eqt = duplicate(eqt)
          let delta = parseInt(m[1])
          if (!!m[2]) {
            this.prnt(`${eqt.name} ${i18n("GURPS.chatUsesReset", "'USES' reset to 'MAX USES'")} (${eqt.maxuses})`)
            eqt.uses = eqt.maxuses
            await actor.update({ [key]: eqt })
          } else if (isNaN(delta)) {
            // only happens with '='
            delta = m[1].substr(1)
            eqt.uses = delta
            await actor.update({ [key]: eqt })
            this.prnt(`${eqt.name} ${i18n("GURPS.chatUsesSet", "'USES' set to")} ${delta}`)
          } else {
            let q = parseInt(eqt.uses) + delta
            let max = parseInt(eqt.maxuses)
            if (isNaN(q)) ui.notifications.warn(eqt.name + " " + i18n("GURPS.chatUsesIsNaN", "'USES' is not a number"))
            else if (q < 0) ui.notifications.warn(eqt.name + " " + i18n("GURPS.chatDoesNotHaveEnough", "does not have enough 'USES'"))
            else if (!isNaN(max) && max > 0 && q > max)
              ui.notifications.warn(`${i18n("GURPS.chatExceededMaxUses", "Exceeded 'MAX USES'")} (${max}) ${i18n("GURPS.for")} ` + eqt.name)
            else {
              this.prnt(`${eqt.name} ${i18n("GURPS.chatUses", "'USES'")} ${m[1]} = ${q}`)
              eqt.uses = q
              await actor.update({ [key]: eqt })
            }
          }
        }
      }
    }
  }
}


class QtyChatProcessor extends ChatProcessor {
  help() { return '/qty &lt;formula&gt; &lt;equipment name&gt;' }   
  matches(line) {
    this.match = line.match(/^\/qty *([\+-=]\d+)(.*)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n("GURPS.chatYouMustHaveACharacterSelected"))
    else {
      let m2 = m[2].trim().match(/^(o[\.:])?(.*)/i)
      let pattern = m2[2]
      let [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
      if (!eqt || !pattern) ui.notifications.warn(i18n("GURPS.chatNoEquipmentMatched", "No equipment matched") + " '" + pattern + "'")
      else {
        eqt = duplicate(eqt)
        let delta = parseInt(m[1])
        if (isNaN(delta)) {
          // only happens with '='
          delta = parseInt(m[1].substr(1))
          if (isNaN(delta)) ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${m[1]}'`)
          else {
            eqt.count = delta
            await actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
            this.prnt(`${eqt.name} ${i18n("GURPS.chatQtySetTo", "'QTY' set to")} ${delta}`)
          }
        } else {
          let q = parseInt(eqt.count) + delta
          if (q < 0) ui.notifications.warn(i18n("GURPS.chatYouDoNotHaveEnough", "You do not have enough") + " '" + eqt.name + "'")
          else {
            this.prnt(`${eqt.name} ${i18n("GURPS.chatQty", "'QTY'")} ${m[1]}`)
            eqt.count = q
            await actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
          }
        }
      }
    }
  }
}


class TrackerChatProcessor extends ChatProcessor {
  help() { return '/tr&lt;N&gt; (or /tr (&lt;name&gt;)) &lt;formula&gt;' }   
  matches(line) {
    this.match = line.match(/^\/(tracker|tr|rt|resource)([0123])?( *\(([^\)]+)\))? *([+-=]\d+)?(reset)?(.*)/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match  
    let actor = GURPS.LastActor
    if (!actor) ui.notifications.warn(i18n("GURPS.chatYouMustHaveACharacterSelected"))
    else {
      let tracker = parseInt(m[2])
      let display = tracker
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
          ui.notifications.warn(`${i18n("GURPS.chatNoResourceTracker", "No Resource Tracker matched")} '${m[3]}'`)
          return
        }
      }
      let delta = parseInt(m[5])
      let reset = ''
      let max = actor.data.data.additionalresources.tracker[tracker].max
      if (!!m[6]) { // reset
        if (!!actor.data.data.additionalresources.tracker[tracker].isDamageTracker) max = 0 // Damage Tracker's reset to zero
        await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: max })
        this.prnt(`${i18n("GURPS.chatResourceTracker", "Resource Tracker")}${display} ${i18n("GURPS.chatResetTo", "reset to")} ${max}`)
      } else if (isNaN(delta)) {
        // only happens with '='
        delta = parseInt(m[5].substr(1))
        if (isNaN(delta)) ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
        else {
          await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: delta })
          this.prnt(`${i18n("GURPS.chatResourceTracker")}${display} set to ${delta}`)
        }
      } else if (!!m[5]) {
        if (max == 0) max = Number.MAX_SAFE_INTEGER
        let v = actor.data.data.additionalresources.tracker[tracker].value + delta
        if (v > max) {
          ui.notifications.warn(`${i18n("GURPS.chatExceededMax", "Exceeded MAX")}:${max} ${i18n("GURPS.for")} ${i18n("GURPS.chatResourceTracker")}${display}`)
          v = max
        }
        if (!!actor.data.data.additionalresources.tracker[tracker].isDamageTracker && v < 0) {
          ui.notifications.warn(`${i18n("GURPS.chatResultBelowZero", "Result below zero")}: ${i18n("GURPS.chatResourceTracker")}${display}`)
          v = 0        
        }
        await actor.update({ ['data.additionalresources.tracker.' + tracker + '.value']: v })
        this.prnt(`${i18n("GURPS.chatResourceTracker")}${display} ${m[5]} = ${v}`)
      } else ui.notifications.warn(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')} '${line}'`)
    }
  }
}

 
          
class StatusProcessor extends ChatProcessor {
  help() { return '/status on|off|t|clear|list &lt;status&gt;' }   
  matches(line) {
    this.match = line.match(/^\/(st|status) +(t|toggle|on|off|\+|-|clear|set|unset|list) *([^\@ ]+)? *(\@self)?/i)
    return !!this.match
  }
  async process(line) {
    let m = this.match  
    let pattern = !m[3]
      ? '.*'
      : new RegExp('^' + m[3].trim().split('*').join('.*?').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + '$') // Make string into a RegEx pattern
    let any = false
    let on = false
    let set = m[2].toLowerCase() == 'on' || m[2] == '+' || m[2] == 'set'
    let toggle = m[2].toLowerCase() == 't' || m[2].toLowerCase() == 'toggle'
    let clear = m[2].toLowerCase() == 'clear'
    let list = m[2].toLowerCase() == 'list'
    var effect, msg
    if (!!list) list = '<table><tr><th>ID:</th><th>NAME:</th></tr>'
    Object.values(CONFIG.statusEffects).forEach(s => {
      let nm = game.i18n.localize(s.label)
      if (nm.match(pattern)) effect = s // match on name or id (shock1, shock2, etc.)
      if (s.id.match(pattern)) effect = s
      if (!!list) list += `<tr><th>${s.id}</th><th>'${nm}'</th></tr>`
    })
    if (!!list) return this.priv(list+'</table>')
    if (!effect) ui.notifications.warn(i18n("GURPS.chatNoStatusMatched", "No status matched") + " '" + pattern + "'")
    else if (!!m[4]) {
      if (!!GURPS.LastActor) {
        let tokens = !!GURPS.LastActor.token ? [GURPS.LastActor.token] : GURPS.LastActor.getActiveTokens()
        if (tokens.length == 0)
          msg = i18n("GURPS.chatNoTokens", "Your character does not have any tokens.   We require a token to set statuses")
        else {
          any = true
          for (const e of GURPS.LastActor.effects) {
            if (clear)
              for (const s of Object.values(CONFIG.statusEffects)) {
                if (s.id == e.getFlag('core', 'statusId')) {
                  await tokens[0].toggleEffect(s)
                  this.prnt(`${i18n("GURPS.chatClearing")} ${s.id}:'${e.data.label}' ${i18n("GURPS.for")} ${GURPS.LastActor.displayname}`)
                }
              }
            else if (effect.id == e.getFlag('core', 'statusId')) on = true
          }
          if (on & !set || (!on && set) || toggle) {
            this.prnt(`${i18n("GURPS.chatToggling")} ${effect.id}:'${game.i18n.localize(effect.label)}' ${i18n("GURPS.for")} ${GURPS.LastActor.displayname}`)
            await tokens[0].toggleEffect(effect)
          }
        }
      } else msg = i18n("chatYouMustHaveACharacterSelected") + " " + i18n("GURPS.chatToApplyEffects")
    } else {
      msg = i18n("GURPS.chatYouMustSelectTokens") + " @self) " + i18n("GURPS.chatToApplyEffects")
      for (const t of canvas.tokens.controlled) {
        any = true
        if (!!t.actor)
          for (const e of t.actor.effects) {
            if (clear)
              for (const s of Object.values(CONFIG.statusEffects)) {
                if (s.id == e.getFlag('core', 'statusId')) {
                  await t.toggleEffect(s)
                  this.prnt(`${i18n("GURPS.chatClearing")} ${s.id}: '${e.data.label}' for ${t.actor.displayname}`)
                }
              }
            else if (effect.id == e.getFlag('core', 'statusId')) on = true
          }
        if (on & !set || (!on && set) || toggle) {
          this.prnt(`${i18n("GURPS.chatToggling")} ${effect.id}:'${game.i18n.localize(effect.label)}' for ${t.actor.displayname}`)
          await t.toggleEffect(effect)
        }
      }
    }
    if (!any) ui.notifications.warn(msg)
  }
}
