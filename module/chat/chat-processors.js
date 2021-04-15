'use strict'

import { ChatProcessors, ChatProcessor } from '../../module/chat.js'
import { parselink } from '../../lib/parselink.js'
import { NpcInput } from '../../lib/npc-input.js'
import { Equipment } from '../actor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'
import { isNiceDiceEnabled } from '../../lib/utilities.js'

export default function RegisterChatProcessors() {
    ChatProcessors.registerProcessor(new RollAgainstChatProcessor())
    ChatProcessors.registerProcessor(new MookChatProcessor())
    ChatProcessors.registerProcessor(new SelectChatProcessor())
    ChatProcessors.registerProcessor(new EveryoneAChatProcessor())
    ChatProcessors.registerProcessor(new EveryoneBChatProcessor())
    ChatProcessors.registerProcessor(new EveryoneCChatProcessor())
    ChatProcessors.registerProcessor(new RollChatProcessor())
}

class RollAgainstChatProcessor extends ChatProcessor {
  help() { return "/ra N | Skillname-N" }
  matches(line) {
    this.match = line.match(/([\.\/]p?ra) +(\w+-)?(\d+)/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match
    if (!!m) {
      let skill = m[2] || 'Default='
      let action = parselink('S:' + skill.replace('-', '=') + m[3])
      this.send(msgs) // send what we have
      GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.substr(1).startsWith('pra') }) 
      return true
    }
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
    return true
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
      let a = list.filter(a => a.name.match(pat))
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
   return true
  }
}

class EveryoneAChatProcessor extends ChatProcessor {
  help() { return "/everyone (or /ev) &lt;formula&gt;" }
  isGMOnly() { return true }

  matches(line) {
    this.match = line.match(/\/(everyone|ev) ([fh]p) reset/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let any = false
    canvas.tokens.ownedTokens.forEach(t => {
      let actor = t.actor
      if (actor.hasPlayerOwner) {
        any = true
        let attr = m[2].toUpperCase()
        let max = actor.data.data[attr].max
        actor.update({ ['data.' + attr + '.value']: max })
        this.priv(`${actor.displayname} ${attr} reset to ${max}`, msgs)
      }
    })
    if (!any) this.priv(`There are no player owned characters!`, msgs)
    return true
  }
}

class EveryoneBChatProcessor extends ChatProcessor {
  help() { return null }    // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() { return true }

  matches(line) {
    this.match = line.match(/\/(everyone|ev) \[(.*)\]/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    let any = false
    let action = parselink(m[2].trim())
    if (!!action.action) {
      if (!['modifier', 'chat', 'pdf'].includes(action.action.type)) {
        canvas.tokens.ownedTokens.forEach(t => {
          let actor = t.actor
          if (actor.hasPlayerOwner) {
            any = true
            GURPS.performAction(action.action, actor)
          }
        })
        if (!any) this.priv(`There are no player owned characters!`, msgs)
      } else this.priv(`Not allowed to execute Modifier, Chat or PDF links [${m[2].trim()}]`, msgs)
    } else this.priv(`Unable to parse On-the-Fly formula: [${m[2].trim()}]`, msgs)
    return true
  }
}

class EveryoneCChatProcessor extends ChatProcessor {
  help() { return null }    // Don't display a help line for this processor.  Useful if you have multiple processors for essentially the same command
  isGMOnly() { return true }

  matches(line) { // /everyone +1 fp or /everyone -2d-1 fp
    this.match = line.match(/\/(everyone|ev) ([fh]p) *([+-]\d+d\d*)?([+-=]\d+)?(!)?/i)
    return !!this.match
  }
  process(line, msgs) {
    let m = this.match  
    if (!!m[3] || !!m[4]) {
      let any = false
      canvas.tokens.ownedTokens.forEach(t => {
        let actor = t.actor
        if (actor.hasPlayerOwner) {
          any = true
          let mod = m[4] || ''
          let value = mod
          let dice = m[3] || ''
          let txt = ''
          if (!!dice) {
            let sign = dice[0] == '-' ? -1 : 1
            let d = dice.match(/[+-](\d+)d(\d*)/)
            let r = d[1] + 'd' + (!!d[2] ? d[2] : '6')
            let roll = Roll.create(r).evaluate()
            if (isNiceDiceEnabled()) game.dice3d.showForRoll(roll, game.user, data.whisper)
            value = roll.total
            if (!!mod)
              if (isNaN(mod)) {
                ui.notifications.warn(`Unrecognized format for '${line}'`)
                return
              } else value += parseInt(mod)
            value = Math.max(value, !!m[5] ? 1 : 0)
            value *= sign
            txt = `(${value}) `
          }
          let attr = m[2].toUpperCase()
          let cur = actor.data.data[attr].value
          let newval = parseInt(value)
          if (isNaN(newval)) {
            // only happens on =10
            newval = parseInt(value.substr(1))
            if (isNaN(newval)) {
              ui.notifications.warn(`Unrecognized format for '${line}'`)
              return
            }
          } else newval += cur
          let mtxt = ''
          let max = actor.data.data[attr].max
          if (newval > max) {
            newval = max
            mtxt = `(max: ${max})`
          }
          actor.update({ ['data.' + attr + '.value']: newval })
          priv(`${actor.displayname} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
        }
      })
      if (!any) priv(`There are no player owned characters!`, msgs)
      return true
    } // Didn't provide dice or scalar, so maybe someone else wants to handle it
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
    } // Looks like a /roll OtF, but didn't parse as one, so allow it to be handled by someone else
  }
}        
          
          
