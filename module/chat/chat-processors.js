'use strict'

import { ChatProcessors, ChatProcessor } from '../../module/chat.js'
import { parselink } from '../../lib/parselink.js'
import { NpcInput } from '../../lib/npc-input.js'
import { Equipment } from '../actor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'

export default function RegisterChatProcessors() {
    ChatProcessors.registerProcessor(new RollAgainstChatProcessor())
    ChatProcessors.registerProcessor(new MookChatProcessor())
    ChatProcessors.registerProcessor(new SelectChatProcessor())

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
      this.sendAllMsgs(msgs) // send what we have
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
    this.addToPrivate('Opening Mook Generator', msgs)
    return true
  }
}

class SelectChatProcessor extends ChatProcessor {
    
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
