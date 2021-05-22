'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { i18n } from '../../lib/utilities.js'

export class IfChatProcessor extends ChatProcessor {
  help() {
    return '/if [OtF] &lt;one&gt; /else &lt;two&gt;'
  }
  matches(line) {  // Since this can get called recursively, we cannot use an instance variable to save the match status
    return line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/)   
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
    } else
      await this.registry.processLines(then)
  }

  async process(line) {
    let m = line.match(/^\/if (! *)?\[([^\]]+)\] (.*)/) // Since this can get called recursively, we cannot use an instance variable to save the match status
    const invert = !!m[1] // !
    const otf = m[2]
    let then = m[3].trim()
    var other
    if (then.match(/{.*}/)) {  // using the advanced sytax
      m = XRegExp.matchRecursive(then, '{', '}', 'g');
      then = m[0].trim()
      other = m[1]?.trim()
    } else if (then.includes('/else ')) {
      m = then.match(/(.*)\/else (.*)/)
      then = m[1].trim()
      other = m[2].trim()
    }
    let action = parselink(otf)
    if (!!action.action) {
      if (['skill-spell', 'attribute', 'attack', 'controlroll', 'chat'].includes(action.action.type)) {
        this.priv(line)
        this.send()
        let event = this.msgs().event
        event.chatmsgData = this.msgs().data
        let pass = await GURPS.performAction(action.action, GURPS.LastActor, event)
        if (invert) pass = !pass
        if (pass) {
          if (!!then) await this._handleResult(then)
        } else if (!!other) await this._handleResult(other)
      } else this.priv(`${i18n('GURPS.chatMustBeACheck')}: [${otf}]`)
    } else this.priv(`${i18n('GURPS.chatUnrecognizedFormat', 'Unrecognized format')}: [${otf}]`)
  }
}
