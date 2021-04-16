'use strict'

import { ChatProcessor } from '../chat.js'
import { parselink } from '../../lib/parselink.js'

export class IfChatProcessor extends ChatProcessor {
  help() { return "/if [OtF] one /else two" }
  matches(line) {
    this.match = line.match(/\/if (!)?\[([^\]]+)\] (.*)/)
    return !!this.match
  }
  async process(line, msgs) {
    let m = this.match
    const invert = !!m[1] // !
    const otf = m[2]
    let than = m[3]
    var other
    if (than.includes(' /else ')) {
      m = than.match(/(.*) \/else (.*)/)
      than = m[1]
      other = m[2]
    }    
    let action = parselink(otf)
    if (!!action.action) {
      if (await GURPS.performAction(action.action, GURPS.LastActor)) {
        console.log("HOLLY SHIT!")
      }
        else  console.log("FAIL!")
    } else
      this.priv(`Unable to parse On-the-Fly formula: [${otf}]`, msgs)
  }
}
