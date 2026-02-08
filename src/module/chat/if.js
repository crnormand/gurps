'use strict'

import { parselink } from '@util/parselink.js'

import ChatProcessor from './chat-processor.js'

export class IfChatProcessor extends ChatProcessor {
  help() {
    return '/if [OtF] [thenOTF] /else [elseOTF]<br>/if [OtF] {thenChatCmd} {elseChatCmd}'
  }
  matches(line) {
    // Since this can get called recursively, we cannot use an instance variable to save the match status
    let match = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)

    return match
  }

  async _handleResult(then) {
    let match = then.match(/^\[([^\]]+)\]/)

    if (match) {
      let action = parselink(match[1].trim())

      if (action.action) {
        if (action.action.type === 'modifier')
          // only need to show modifiers, everything else does something.
          this.priv(then)
        else this.send() // send what we have
        await GURPS.performAction(action.action, GURPS.LastActor, this.msgs().event)
      }
    } else await this.registry.processLines(then)
  }

  async process(line) {
    let match = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/) // Since this can get called recursively, we cannot use an instance variable to save the match status
    const invert = !!match[1] // !
    const otf = match[2]
    const restOfLine = match[3].trim()
    const results = {
      s: restOfLine, // assume what is left if the success result.
    } // s, f, cs, cf

    if (restOfLine.match(/{.*}/)) {
      // using the advanced sytax
      match = XRegExp.matchRecursive(restOfLine, '{', '}', 'g', { valueNames: ['between', null, 'match', null] })
      let needSuccess = true // if we don't get a prefix, assume it is s:{} 'success'
      var next, key

      while ((next = match.shift())) {
        let value = next.value.trim()

        if (next.name === 'between' && value.endsWith(':')) key = value.slice(0, -1)
        if (!key || !key.trim()) key = needSuccess ? 's' : 'f'
        if (key === 's') needSuccess = false

        if (next.name === 'match') {
          results[key] = next.value
          key = ''
        }
      }
    } else if (restOfLine.includes('/else ')) {
      match = restOfLine.match(/(.*)\/else (.*)/)
      results.s = match[1].trim()
      results.f = match[2].trim()
    }

    let action = parselink(otf)

    if (action.action) {
      if (
        ['skill-spell', 'attribute', 'attack', 'controlroll', 'chat', 'test-exists', 'iftest'].includes(
          action.action.type
        )
      ) {
        this.priv(line)
        this.send()
        let event = this.msgs().event

        event.chatmsgData = this.msgs().data
        let pass = await GURPS.performAction(action.action, GURPS.LastActor, event)

        if (GURPS.stopActions) {
          console.log('Stop actions after dialog canceled')
          GURPS.stopActions = false

          return
        }

        if (invert) pass = !pass
        if (pass) {
          if (!!results.cs && GURPS.lastTargetedRoll?.isCritSuccess) {
            await this._handleResult(results.cs)
          } else if (results.s) await this._handleResult(results.s)
        } else if (!!results.cf && GURPS.lastTargetedRoll?.isCritFailure) {
          await this._handleResult(results.cf)
        } else if (results.f) await this._handleResult(results.f)
      } else this.priv(`${game.i18n.localize('GURPS.chatMustBeACheck')}: [${otf}]`)
    } else this.priv(`${game.i18n.localize('GURPS.chatUnrecognizedFormat', 'Unrecognized format')}: [${otf}]`)
  }
}
