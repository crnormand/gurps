'use strict'
import { parselink } from '../lib/parselink.js'
import { NpcInput } from '../lib/npc-input.js'
import { Equipment } from './actor.js'
import * as Settings from '../lib/miscellaneous-settings.js'

/**
 *  This holds functions for all things chat related
 *
 */

function whisper(priv) {
  if (priv.length == 0) return
  ChatMessage.create({
    alreadyProcessed: true,
    content: priv.join('<br>'),
    user: game.user._id,
    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
    whisper: [game.user._id],
  })
  priv.length = 0
}

function chat(pub, chatData) {
  if (pub.length == 0) return
  let d = duplicate(chatData)
  d.alreadyProcessed = true
  d.content = pub.join('<br>')
  ChatMessage.create(d)
  pub.length = 0
}

function send(priv, pub, data) {
  this.whisper(priv)
  this.chat(pub, data)
}

/**
 * Base class for a chat message processor.
 */
export class ChatProcessor {
  /**
   * Override
   * @param {*} line - chat command
   * @returns true if this processor will handle this chat command
   */
  matches(line) {}

  /**
   * Override to process a chat command
   * @param {*} line
   */
  process(line, msgs) {}
  
  /**
   * Override to return the '/help' display string
   * @param {*} isGMOnly
   */
  help() { return "Must return help string or null" }
  
  /**
   * Override to true if this chat command only works for GMs
   */
  isGMOnly() { return false }
  
  send(msgs) {
    this.registry.send(msgs)
  }
  
  // Stack up as many private messages as we can, until we need to print a public one (to reduce the number of chat messages)
  priv(txt, msgs) {
    if (msgs.pub.length > 0) this.send(msgs)
    msgs.priv.push(txt)
  }
  // Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
  pub(txt, msgs) {
    if (msgs.priv.length > 0) this.send(msgs)
    msgs.pub.push(txt)
  }
  // Uncertain if these should be priv or pub
  prnt(text, msgs) {
    let p_setting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PLAYER_CHAT_PRIVATE)
    if (game.user.isGM || p_setting) priv(text, msgs)
    else pub(text, msgs)
  }
}

class HelpChatProcessor extends ChatProcessor {
  help() { return null }
  matches(line) {
    return line.match(/[!\/]help/i)
  }
  process(line, msgs) {
    let t = "<a href='" + GURPS.USER_GUIDE_URL + "'>GURPS 4e Game Aid USERS GUIDE</a><br>"
    let all = ChatProcessors.processorsForAll().filter(it => !!it.help()).map(it => it.help())
    let gmonly = ChatProcessors.processorsForGMOnly().filter(it => !!it.help()).map(it => it.help())
    all.sort()
    t += all.join('<br>')
    if (gmonly.length > 0) {
      gmonly.sort()
      t += '<br>--- GM only ---<br>'
      t += gmonly.join('<br>')
    }
    this.priv(t, msgs)
  }
}

class ChatProcessorRegistry {
  constructor() {
    this._processors = []
    this.registerProcessor(new HelpChatProcessor())
  }
  
  _processorsForUser() {
    return this._processors.filter(it => !it.isGMOnly() || game.user.isGM)
  }
  
  processorsForAll() {
    return this._processors.filter(it => !it.isGMOnly())
  }
  processorsForGMOnly() {
    return this._processors.filter(it => it.isGMOnly())
  }


  /**
   * Handle the chat message
   * @param {String} line - chat input
   * @returns true, if handled
   */
  handle(line, msgs) {
    let processor = this._processorsForUser().find(it => it.matches(line))
    if (!!processor) return processor.process(line, msgs) != false // Assume true... but processors can return 'false'
    return false
  }

  /**
   * Register a chat processor
   * @param {*} processor
   */
  registerProcessor(processor) {
    processor.registry = this
    this._processors.push(processor)
  }
    
  _sendPriv(priv) {
    if (priv.length == 0) return
    ChatMessage.create({
      alreadyProcessed: true,
      content: priv.join('<br>'),
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      whisper: [game.user._id],
    })
    priv.length = 0
  }
  
  _sendPub(pub, chatData) {
    if (pub.length == 0) return
    let d = duplicate(chatData) // duplicate the original chat data (to maintain speaker, etc.)
    d.alreadyProcessed = true
    d.content = pub.join('<br>')
    ChatMessage.create(d)
    pub.length = 0
  }
  
  // Dump everything we have saved in messages
  send(msgs) {
    this._sendPriv(msgs.priv)
    this._sendPub(msgs.pub, msgs.data)
  }
  // Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
  pub(txt, msgs) {
    if (msgs.priv.length > 0) this.send(msgs)
    msgs.pub.push(txt)
  }

}

export let ChatProcessors = new ChatProcessorRegistry()

export default function addChatHooks() {
  Hooks.once('init', async function () {  
    Hooks.on('chatMessage', (log, message, data) => {
      if (!!data.alreadyProcessed) return true // The chat message has already been parsed for GURPS commands show it should just be displayed
      if (GURPS.ChatCommandsInProcess.includes(message)) {
        GURPS.ChatCommandsInProcess = GURPS.ChatCommandsInProcess.filter(item => item !== message)
        return true // Ok. this is a big hack, and only used for singe line chat commands... but since arrays are synchronous and I don't expect chat floods, this is safe
      }

      let msgs = { pub: [], priv: [], data: data }

      let handled = false // have we handled at least one message
      message
        .replace(/\\\\/g, '\n')   // Allow \\ to ack as newline (useful for combining multiple chat commands on a single line
        .split('\n')
        .forEach(line => {
          if (ChatProcessors.handle(line, msgs)) {
            handled = true
            return
          }
 
          // It isn't one of our commands...
          if (line.trim().startsWith('/')) {
            // immediately flush our stored msgs, and execute the slash command using the default parser
            send(msgs)
            GURPS.ChatCommandsInProcess.push(line) // Remember which chat message we are running, so we don't run it again!
            ui.chat.processMessage(line).catch(err => {
              ui.notifications.error(err)
              console.error(err)
            })
            handled = true
          } else ChatProcessors.pub(line, msgs) // If not handled, must just be public text
        }) // end split
      if (handled) {
        // If we handled 'some' messages, then send the remaining messages, and return false (so the default handler doesn't try)
        ChatProcessors.send(msgs)
        return false // Don't display this chat message, since we have handled it with others
      } else return true
    })

    // Look for blind messages with .message-results and remove them
    /*  Hooks.on("renderChatMessage", (log, content, data) => {
      if (!!data.message.blind) {
          if (data.author?.isSelf && !data.author.isGm) {   // We are rendering the chat message for the sender (and they are not the GM)
            $(content).find(".gurps-results").html("...");  // Replace gurps-results with "...".  Does nothing if not there.
          }
        }
      });  */

    // Add the "for" attribute to a collapsible panel label. This is needed
    // because the server in 0.7.8 strips the "for" attribute in an attempt
    // to guard against weird security hacks. When "for" is whitelisted as
    // a valid attribute (future) we can remove this.
    Hooks.on('renderChatMessage', (app, html, msg) => {
      // this is a fucking hack
      let wrapper = html.find('.collapsible-wrapper')
      if (wrapper.length > 0) {
        console.log($(wrapper).html())
        let input = $(wrapper).find('input.toggle')[0]
        let label = $(input).siblings('label.label-toggle')[0]
        let id = input.id
        let labelFor = $(label).attr('for')
        if (labelFor !== id) {
          $(label).attr('for', id)
        }
        console.log($(wrapper).html())
      }
    })

    // Look for RESULTS from a RollTable.   RollTables do not generate regular chat messages
    Hooks.on('preCreateChatMessage', (data, options, userId) => {
      let c = data.content
      try {
        let html = $(c)
        let rt = html.find('.result-text') // Ugly hack to find results of a roll table to see if an OtF should be "rolled" /r /roll
        let re = /^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/
        let t = rt[0]?.innerText
        if (!!t) {
          t.split('\n').forEach(e => {
            let m = e.match(re)
            if (!!m && !!m[2]) {
              let action = parselink(m[2])
              if (!!action.action) {
                GURPS.performAction(action.action, GURPS.LastActor, {
                  shiftKey: e.startsWith('/pr'),
                })
                //          return false; // Return false if we don't want the rolltable chat message displayed.  But I think we want to display the rolltable result.
              }
            }
          })
        }
      } catch (e) {} // a dangerous game... but limited to GURPs /roll OtF
      data.content = game.GURPS.gurpslink(c)
    })

    Hooks.on('renderChatMessage', (app, html, msg) => {
      GURPS.hookupGurps(html)
      html.find('[data-otf]').each((_, li) => {
      li.setAttribute('draggable', true)
      li.addEventListener('dragstart', ev => {
        return ev.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            otf: li.getAttribute('data-otf')
          })
        )
      })
    })

    })
  }) // End of "ready"
}
