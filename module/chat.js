'use strict'
import { parselink } from '../lib/parselink.js'
import * as Settings from '../lib/miscellaneous-settings.js'
import { i18n } from '../lib/utilities.js'
import ChatProcessor from './chat/chat-processor.js'
/**
 *  This holds functions for all things chat related
 *
 */

class HelpChatProcessor extends ChatProcessor {
  help() {
    return null
  }
  matches(line) {
    return line.match(/[!\/]help/i)
  }
  process(line, msgs) {
    let t =
      "<a href='" +
      GURPS.USER_GUIDE_URL +
      "'>" +
      i18n('GURPS.gameAidUsersGuide', 'GURPS 4e Game Aid USERS GUIDE') +
      '</a><br>'
    let all = ChatProcessors.processorsForAll()
      .filter(it => !!it.help())
      .map(it => it.help())
    let gmonly = ChatProcessors.processorsForGMOnly()
      .filter(it => !!it.help())
      .map(it => it.help())
    all.sort()
    t += all.join('<br>')
    if (gmonly.length > 0) {
      gmonly.sort()
      t += '<br>--- GM only ---<br>'
      t += gmonly.join('<br>')
    }
    this.priv(t)
  }
}

class ChatProcessorRegistry {
  constructor() {
    this._processors = []
    this.registerProcessor(new HelpChatProcessor())
    this.msgs = { pub: [], priv: [], data: null }
  }

  processorsForAll() {
    return this._processors.filter(it => !it.isGMOnly())
  }
  processorsForGMOnly() {
    return this._processors.filter(it => it.isGMOnly())
  }

  // Make a pre-emptive decision if we are going to handle any of the lines in this message
  willTryToHandle(message) {
    let lines = message.split('\n') // Just need a simple split by newline... more advanced splitting will occur later
    for (const line of lines) 
      for (const p of this._processors) 
        if (line[0] == '!' ? p.matches(line.substr(1)) : p.matches(line)) return true
    return false
  }

  /* At this point, we just have to assume that we are going to handle some (if not all) of the messages in lines.
   * From this point on, we want to be in a single thread... so we await any async methods to ensure that
   * we get a response.
   */
  async startProcessingLines(message, chatmsgData, event) {
    if (!chatmsgData)
      chatmsgData = {
        user: game.user.id,
        speaker: {
          actor: !!GURPS.LastActor ? GURPS.LastActor.id : undefined,
        },
      }
    this.msgs.quiet = false
    this.msgs.oldQuiet = false
    this.msgs.data = chatmsgData
    this.msgs.event = event || { shiftKey: false, ctrlKey: false, data: {} }
    let answer = await this.processLines(message)
    this.send()
    return answer
  }

  async processLines(message) {
    // Look for non-escaped { } double backslash "\\" and convert to newlines.  I just couldn't figure out a good regex pattern... so I just did it manually.
    let lines = []
    let start = 0
    let escaped = 0
    let backslash = false
    for (let i = 0; i < message.length; i++) {
      const c = message[i]
      if (c == '\\') {
        if (escaped == 0) {
          if (backslash) {
            lines.push(message.substring(start, i - 1))
            start = i + 1
            backslash = false
          } else backslash = true
        }
      } else backslash = false
      if (c == '{') escaped++
      if (c == '}') escaped--
      if (c == '\n') {
        lines.push(message.substring(start, i))
        start = i + 1
      }
    }
    if (start < message.length) lines.push(message.substr(start))
    let answer = false
    for (const line of lines) {
      // use for loop to ensure single thread
      answer = await this.processLine(line)
    }
    return answer
  }

  async processLine(line) {
    line = line.trim()
    this.msgs.oldQuiet = this.msgs.quiet
    if (line[0] == '!') {
      this.msgs.quiet = true
      line = line.substr(1)
    }
    let [handled, answer] = await this.handle(line)
    if (!handled) {
      if (line.trim().startsWith('/')) {
        // immediately flush our stored msgs, and execute the slash command using the default parser
        this.send()
        GURPS.ChatCommandsInProcess.push(line) // Remember which chat message we are running, so we don't run it again!
        ui.chat.processMessage(line).catch(err => {
          ui.notifications.error(err)
          console.error(err)
        })
      } else this.pub(line) // If not handled, must just be public text
    }
    this.msgs.quiet = this.msgs.oldQuiet
    return answer
  }

  /**
   * Handle the chat message
   * @param {String} line - chat input
   * @returns true, if handled
   */
  async handle(line) {
    let answer = false
    let processor = this._processors.find(it => it.matches(line))
    if (!!processor) {
      if (processor.isGMOnly() && !game.user.isGM) ui.notifications.warn(i18n('GURPS.chatYouMustBeGM'))
      else {
        try {
          answer = await processor.process(line)
        } catch (err) {
          ui.notifications.error(err)
          console.error(err)
        }
        return [true, answer != false]
      }
    }
    return [false, false]
  }

  /**
   * Register a chat processor
   * @param {*} processor
   */
  registerProcessor(processor) {
    processor.registry = this // Provide a back pointer so that processors can get access to the message structure
    this._processors.push(processor)
  }

  _sendPriv(priv) {
    if (priv.length == 0) return
    let lines = priv.slice()
    renderTemplate('systems/gurps/templates/chat-processing.html', {
      lines: lines,
    }).then(content => {
      ChatMessage.create({
        alreadyProcessed: true,
        content: content,
        user: game.user.id,
        type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
        whisper: [game.user.id],
      })
    })
    priv.length = 0
  }

  _sendPub(pub, chatData) {
    if (pub.length == 0) return

    let d = duplicate(chatData) // duplicate the original chat data (to maintain speaker, etc.)
    d.alreadyProcessed = true
    let lines = pub.slice()
    renderTemplate('systems/gurps/templates/chat-processing.html', {
      lines: lines,
    }).then(content => {
      d.content = content
      ChatMessage.create(d)
    })
    pub.length = 0
  }

  // Dump everything we have saved in messages
  send() {
    this._sendPriv(this.msgs.priv)
    this._sendPub(this.msgs.pub, this.msgs.data)
  }
  // Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
  pub(txt) {
    if (this.msgs.priv.length > 0) this.send()
    this.msgs.pub.push(txt)
  }

  // Stack up as many private messages as we can, until we need to print a public one (to reduce the number of chat messages)
  priv(txt, force = false) {
    if (this.msgs.quiet && ! force) return;
    if (this.msgs.pub.length > 0) this.send()
    this.msgs.priv.push(txt)
  }

  // Uncertain if these should be priv or pub
  prnt(txt) {
    let p_setting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PLAYER_CHAT_PRIVATE)
    if (game.user.isGM || p_setting) this.priv(txt)
    else this.pub(txt)
  }

  // Attempt to convert original chat data into a whisper (for use when the player presses SHIFT key to make roll private)
  setEventFlags(quiet, shift, ctrl) {
    this.msgs.quiet = quiet
    this.msgs.oldQuiet = quiet
    this.msgs.data.type = CONST.CHAT_MESSAGE_TYPES.WHISPER
    this.msgs.data.whisper = [game.user.id]
    mergeObject(this.msgs.event, { shiftKey: shift, ctrlKey: ctrl })
  }
}

export let ChatProcessors = new ChatProcessorRegistry()

export default function addChatHooks() {
  Hooks.once('init', async function () {
    GURPS.ChatProcessors = ChatProcessors
    Hooks.on('chatMessage', (log, message, chatmsgData) => {
      if (!!chatmsgData.alreadyProcessed) return true // The chat message has already been parsed for GURPS commands show it should just be displayed

      if (GURPS.ChatCommandsInProcess.includes(message)) {
        GURPS.ChatCommandsInProcess = GURPS.ChatCommandsInProcess.filter(item => item !== message)
        return true // Ok. this is a big hack, and only used for singe line chat commands... but since arrays are synchronous and I don't expect chat floods, this is safe
      }

      // Due to Foundry's non-async way of handling the 'chatMessage' response, we have to decide beforehand
      // if we are going to process this message, and if so, return false so Foundry doesn't
      if (ChatProcessors.willTryToHandle(message)) {
        // Now we can handle the processing of each line in an async method, so we can ensure a single thread
        ChatProcessors.startProcessingLines(message, chatmsgData)
        return false
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
        //console.log($(wrapper).html())
        let input = $(wrapper).find('input.toggle')[0]
        let label = $(input).siblings('label.label-toggle')[0]
        let id = input.id
        let labelFor = $(label).attr('for')
        if (labelFor !== id) {
          $(label).attr('for', id)
          console.log(`add the 'for' attribute if needed: ${$(wrapper).html()}`)
        }
      }
    })

    // Look for RESULTS from a RollTable.   RollTables do not generate regular chat messages
    Hooks.on('preCreateChatMessage', (chatMessage, options, userId) => {
      let c = chatMessage.data.content
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
      let newContent = game.GURPS.gurpslink(c)
      let update = { content: newContent }
      chatMessage.data.update(update)
      return true
    })

    Hooks.on('renderChatMessage', (app, html, msg) => {
      GURPS.hookupGurps(html)
      html.find('[data-otf]').each((_, li) => {
        li.setAttribute('draggable', true)
        li.addEventListener('dragstart', ev => {
          return ev.dataTransfer.setData(
            'text/plain',
            JSON.stringify({
              otf: li.getAttribute('data-otf'),
            })
          )
        })
      })
    })
    
    Hooks.on('diceSoNiceRollComplete', async (app, html, msg) => {
      let otf = GURPS.PendingOTFs.pop()
      while (otf) {
        let action = parselink(otf)
        if (!!action.action) await GURPS.performAction(action.action, GURPS.LastActor || game.user)
        otf = GURPS.PendingOTFs.pop()
      }
    })
    
  }) // End of "init"
}
