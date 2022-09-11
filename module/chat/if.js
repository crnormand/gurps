'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { i18n } from '../../lib/utilities.js'

export class IfChatProcessor extends ChatProcessor {
  help() {
    return '/if [OtF] [thenOTF] /else [elseOTF]<br>/if [OtF] {thenChatCmd} {elseChatCmd}'
  }
  matches(line) {
    // Since this can get called recursively, we cannot use an instance variable to save the match status
    let m = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)
    return m
  }

  async _handleResult(then) {
    let m = then.match(/^\[([^\]]+)\]/)
    if (!!m) {
      let action = parselink(m[1].trim())
      if (!!action.action) {
        if (action.action.type === 'modifier')
          // only need to show modifiers, everything else does something.
          this.priv(then)
        else this.send() // send what we have
        await GURPS.performAction(action.action, GURPS.LastActor, this.msgs().event)
      }
    } else await this.registry.processLines(then)
  }

  async process(line) {
    let m = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/) // Since this can get called recursively, we cannot use an instance variable to save the match status
    const invert = !!m[1] // !
    const otf = m[2]
    const restOfLine = m[3].trim()
    const results = {
      s: restOfLine, // assume what is left if the success result.
    } // s, f, cs, cf
    if (restOfLine.match(/{.*}/)) {
      // using the advanced sytax
      m = XRegExp.matchRecursive(restOfLine, '{', '}', 'g', { valueNames: ['between', null, 'match', null] })
      let needSuccess = true // if we don't get a prefix, assume it is s:{} 'success'
      var next, key
      while ((next = m.shift())) {
        let v = next.value.trim()
        if (next.name == 'between' && v.endsWith(':')) key = v.slice(0, -1)
        if (!key || !key.trim()) key = needSuccess ? 's' : 'f'
        if (key == 's') needSuccess = false
        if (next.name == 'match') {
          results[key] = next.value
          key = ''
        }
      }
    } else if (restOfLine.includes('/else ')) {
      m = restOfLine.match(/(.*)\/else (.*)/)
      results.s = m[1].trim()
      results.f = m[2].trim()
    }
    let action = parselink(otf)
    if (!!action.action) {
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
        if (invert) pass = !pass
        if (pass) {
          if (!!results.cs && GURPS.lastTargetedRoll?.isCritSuccess) {
            await this._handleResult(results.cs)
          } else if (!!results.s) await this._handleResult(results.s)
        } else if (!!results.cf && GURPS.lastTargetedRoll?.isCritFailure) {
          await this._handleResult(results.cf)
        } else if (!!results.f) await this._handleResult(results.f)
      } else this.priv(`${i18n('GURPS.chatMustBeACheck')}: [${otf}]`)
    } else this.priv(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')}: [${otf}]`)
  }
}
