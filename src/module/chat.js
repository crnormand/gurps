'use strict'

import * as Settings from '@util/miscellaneous-settings.js'
import { parselink } from '@util/parselink.js'

import { gurpslink } from './util/gurpslink.ts'

import ChatProcessor from './chat/chat-processor.js'
import GurpsWiring from './gurps-wiring.js'

/**
 *  This holds functions for all things chat related
 *
 */
class HelpChatProcessor extends ChatProcessor {
  help() {
    return null
  }

  /** @param {string} line */
  matches(line) {
    return line.match(/[!/?]help/i)
  }

  /**
   * Override to process a chat command
   * @param {string} _line
   * @param {any} _msgs
   */
  async process(_line, _msgs) {
    let lines = _line.split(' ')

    if (lines.length > 1) return this.registry.handle('?' + lines[1].trim())

    let element = `<a href='${GURPS.USER_GUIDE_URL}'>${game.i18n.localize('GURPS.gameAidUsersGuide')}</a><br>`
    let all = ChatProcessors.processorsForAll()
      .filter(it => !!it.help())
      .map(it => it.help())
    let gmonly = ChatProcessors.processorsForGMOnly()
      .filter(it => !!it.help())
      .map(it => it.help())

    all.sort()
    element += all.join('<br>')

    if (gmonly.length > 0) {
      gmonly.sort()
      element += '<br>--- GM only ---<br>'
      element += gmonly.join('<br>')
    }

    element += '<br><br>' + game.i18n.localize('GURPS.chatHelpHelp')
    this.priv(element)
  }
}

class ChatProcessorRegistry {
  constructor() {
    /**
     * @type {ChatProcessor[]}
     */
    this._processors = []

    this.registerProcessor(new HelpChatProcessor())

    /** @type {{pub: string[], priv: string[], data: any, quiet?: boolean, oldQuiet?: boolean, event?: any}} */
    this.msgs = { pub: [], priv: [], data: null }
  }

  processorsForAll() {
    return this._processors.filter(it => !it.isGMOnly())
  }
  processorsForGMOnly() {
    return this._processors.filter(it => it.isGMOnly())
  }

  /**
   * Make a pre-emptive decision if we are going to handle any of the lines in this message
   * @param {string} message
   */
  willTryToHandle(message) {
    let lines = message.split('\n') // Just need a simple split by newline... more advanced splitting will occur later

    for (const line of lines)
      for (const processor of this._processors) {
        if (
          processor.matches(line) ||
          (line[0] === '!' ? processor.matches(line.substring(1)) : processor.matches(line))
        )
          return true
      }

    return false
  }

  /**
   * At this point, we just have to assume that we are going to handle some (if not all) of the messages in lines.
   * From this point on, we want to be in a single thread... so we await any async methods to ensure that
   * we get a response.
   * @param {string} message
   * @param {{shiftKey: boolean;ctrlKey: boolean;data: {};} | undefined} [event]
   * @param {import('@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData').ChatMessageDataConstructorData | { speaker: any}} chatmsgData
   * @returns {Promise<boolean>}
   */
  async startProcessingLines(message, chatmsgData, event) {
    if (!chatmsgData)
      chatmsgData = {
        user: game.user?.id || null,
        // @ts-expect-error - partial speaker object initialization
        speaker: {
          actor: GURPS.LastActor ? GURPS.LastActor.id : undefined,
        },
      }

    this.msgs.quiet = false
    this.msgs.oldQuiet = false
    this.msgs.data = chatmsgData
    this.msgs.event = event
      ? { shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, data: event.data || {}, currentTarget: event.currentTarget }
      : { shiftKey: false, ctrlKey: false, data: {} }

    let answer = await this.processLines(message)

    this.send()

    return answer
  }

  /**
   * @param {string} message
   */
  async processLines(message) {
    // Look for non-escaped { } double backslash "\\" and convert to newlines.  I just couldn't figure out a good regex pattern... so I just did it manually.
    let lines = []
    let start = 0
    let escaped = 0
    let backslash = false

    for (let i = 0; i < message.length; i++) {
      const char = message[i]

      if (char === '\\') {
        if (escaped === 0) {
          if (backslash) {
            lines.push(message.substring(start, i - 1))
            start = i + 1
            backslash = false
          } else backslash = true
        }
      } else backslash = false
      if (char === '{') escaped++
      if (char === '}') escaped--

      if (char === '\n') {
        lines.push(message.substring(start, i))
        start = i + 1
      }
    }

    if (start < message.length) lines.push(message.substr(start))
    let answer = false

    // TODO consider Promise.then(Promise)...
    for (const line of lines) {
      // use for loop to ensure single thread
      answer = await this.processLine(line)

      if (GURPS.stopActions) {
        console.log('Stop actions after dialog canceled')
        GURPS.stopActions = false
        break
      }
    }

    return answer
  }

  /**
   * @param {string} line
   */
  async processLine(line) {
    line = line.trim()
    this.msgs.oldQuiet = this.msgs.quiet

    if (line[0] === '!') {
      this.msgs.quiet = true
      line = line.substr(1)
    }

    let [handled, answer] = await this.handle(line)

    if (!handled) {
      if (line.trim().startsWith('/')) {
        // immediately flush our stored msgs, and execute the slash command using the default parser
        this.send()
        GURPS.ChatCommandsInProcess.push(line) // Remember which chat message we are running, so we don't run it again!
        // @ts-expect-error - Foundry VTT ChatLog API not fully typed
        ui.chat?.processMessage(line).catch(err => {
          ui.notifications?.error(err)
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

    if (processor) {
      if (processor.isGMOnly() && !game.user?.isGM) ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustBeGM'))
      else {
        try {
          answer = await processor.process(line)
        } catch (err) {
          ui.notifications?.error(err)
          console.error(err)
        }

        return [true, answer != false]
      }
    }

    // if nothing matchs, check for chat command without options... and return a help output
    processor = this._processors.find(it => it.usagematches(line))

    if (processor) {
      if (processor.isGMOnly() && !game.user?.isGM) ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustBeGM'))
      else this.priv(line)
      this.priv('<hr>')
      this.priv(processor.usage().replaceAll('\n', '<br>'))

      return [true, true]
    }

    return [false, false]
  }

  /**
   * Register a chat processor
   * @param {ChatProcessor} processor
   */
  registerProcessor(processor) {
    processor.registry = this // Provide a back pointer so that processors can get access to the message structure
    this._processors.push(processor)
  }

  /**
   * @param {string[]} priv
   */
  _sendPriv(priv) {
    if (priv.length === 0) return
    let lines = priv.slice()

    foundry.applications.handlebars
      .renderTemplate('systems/gurps/templates/chat-processing.hbs', {
        lines: lines,
      })
      .then(content => {
        ChatMessage.create({
          alreadyProcessed: true,
          content: content,
          user: game.user?.id,
          whisper: [game.user?.id || ''],
        })
      })
    priv.length = 0
  }

  /**
   * @param {string[]} pub
   * @param {any} chatData
   */
  _sendPub(pub, chatData) {
    if (pub.length === 0) return

    let dupe = foundry.utils.duplicate(chatData) // duplicate the original chat data (to maintain speaker, etc.)

    dupe.alreadyProcessed = true
    let lines = pub.slice()

    foundry.applications.handlebars
      .renderTemplate('systems/gurps/templates/chat-processing.hbs', {
        lines: lines,
      })
      .then(content => {
        dupe.content = content
        ChatMessage.create(dupe)
      })
    pub.length = 0
  }

  // Dump everything we have saved in messages
  send() {
    this._sendPriv(this.msgs.priv)
    this._sendPub(this.msgs.pub, this.msgs.data)
  }

  // Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
  /**
   * @param {string} txt
   */
  pub(txt) {
    if (this.msgs.priv.length > 0) this.send()
    this.msgs.pub.push(txt)
  }

  // Stack up as many private messages as we can, until we need to print a public one (to reduce the number of chat messages)
  /**
   * @param {string} txt
   */
  priv(txt, force = false) {
    if (this.msgs.quiet && !force) return
    if (this.msgs.pub.length > 0) this.send()
    this.msgs.priv.push(txt)
  }

  // Uncertain if these should be priv or pub
  /**
   * @param {string} txt
   */
  prnt(txt) {
    let p_setting = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_PLAYER_CHAT_PRIVATE)

    if (game.user?.isGM || p_setting) this.priv(txt)
    else this.pub(txt)
  }

  // Attempt to convert original chat data into a whisper (for use when the player presses SHIFT key to make roll private)
  /**
   * @param {boolean} quiet
   * @param {boolean} shift
   * @param {boolean} ctrl
   */
  setEventFlags(quiet, shift, ctrl) {
    this.msgs.quiet = quiet
    this.msgs.oldQuiet = quiet
    this.msgs.data.whisper = [game.user?.id]

    // HACK: This try / catch prevents errors from showing to the user in cases where properties shiftKey and/or ctrlKey of `this.msgs.event`
    // are not writeable, such as if the event is a PointerEvent (e.g. in Token Action HUD). The real underlying problem is that we are
    // attempting to mutate properties of a native Event object, whose modifier-key properties may be immutable; a more correct long-term
    // solution would be to store the desired shift/ctrl flags separately (e.g. on the message data) rather than modifying the event object
    // itself. This workaround should not persist following any refactor of our chat processing code. - MT
    try {
      foundry.utils.mergeObject(this.msgs.event, { shiftKey: shift, ctrlKey: ctrl })
    } catch (err) {
      console.warn('Failed to set event flags on event object:', err)
    }
  }
}

export let ChatProcessors = new ChatProcessorRegistry()

export default function addChatHooks() {
  Hooks.once('init', async function () {
    GURPS.ChatProcessors = ChatProcessors
    Hooks.on('chatMessage', (_log, message, chatmsgData) => {
      // @ts-expect-error - custom property added to chat message data
      if (chatmsgData.alreadyProcessed) return true // The chat message has already been parsed for GURPS commands show it should just be displayed

      if (GURPS.ChatCommandsInProcess.includes(message)) {
        GURPS.ChatCommandsInProcess = GURPS.ChatCommandsInProcess.filter(
          (/** @type {string} */ item) => item !== message
        )

        return true // Ok. this is a big hack, and only used for singe line chat commands... but since arrays are synchronous and I don't expect chat floods, this is safe
      }

      // Due to Foundry's non-async way of handling the 'chatMessage' response, we have to decide beforehand
      // if we are going to process this message, and if so, return false so Foundry doesn't
      if (ChatProcessors.willTryToHandle(message)) {
        // Now we can handle the processing of each line in an async method, so we can ensure a single thread
        // @ts-expect-error - chatmsgData type mismatch with expected parameter
        ChatProcessors.startProcessingLines(message, chatmsgData)

        return false
      } else return true
    })

    // Look for RESULTS from a RollTable.   RollTables do not generate regular chat messages
    Hooks.on(
      'preCreateChatMessage',
      (/** @type {ChatMessage} */ chatMessage, /** @type {any} */ _options, /** @type {any} */ _userId) => {
        let content = chatMessage.content

        try {
          let html = $(content)
          let rt = html.find('.result-text') // Ugly hack to find results of a roll table to see if an OtF should be "rolled" /r /roll
          let re = /^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/
          let text = rt[0]?.innerText

          if (text) {
            text.split('\n').forEach(rollCommandLine => {
              let match = rollCommandLine.match(re)

              if (!!match && !!match[2]) {
                let action = parselink(match[2])

                if (action.action) {
                  GURPS.performAction(action.action, GURPS.LastActor, {
                    shiftKey: rollCommandLine.startsWith('/pr'),
                  })
                  //          return false; // Return false if we don't want the rolltable chat message displayed.  But I think we want to display the rolltable result.
                }
              }
            })
          }
        } catch {
          // a dangerous game... but limited to GURPs /roll OtF
        }

        let newContent = gurpslink(content)

        foundry.utils.setProperty(chatMessage, '_source.content', newContent)

        return true
      }
    )

    Hooks.on('renderChatMessageHTML', (_app, html, _msg) => {
      GurpsWiring.hookupAllEvents(html)
    })

    Hooks.on(
      'diceSoNiceRollComplete',
      async (/** @type {any} */ _app, /** @type {any} */ _html, /** @type {any} */ _msg) => {
        let otf = GURPS.PendingOTFs.pop()

        while (otf) {
          let action = parselink(otf)

          if (action.action) await GURPS.performAction(action.action, GURPS.LastActor || game.user)
          otf = GURPS.PendingOTFs.pop()
        }
      }
    )
  }) // End of "init"
}
