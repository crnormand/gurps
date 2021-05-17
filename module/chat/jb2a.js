'use strict'

import ChatProcessor from './chat-processor.js'
import { parselink } from '../../lib/parselink.js'
import { isNiceDiceEnabled, splitArgs, wait, makeRegexPatternFrom } from '../../lib/utilities.js'

export default class JB2AChatProcessor extends ChatProcessor {
  help() {
    return '/jb2a &lt;animation macro name&gt;'
  }
  matches(line) {
    this.match = line.match(/^\/jb2a +(\d*) *(.*)/i)
    return !!this.match
  }
  async process(line) {
    let otigons = game.packs.entries.filter(c => c.metadata.module?.startsWith("otigons"))
    if (otigons.length == 0) {
      ui.notifications.warn('You must have https://github.com/otigon/otigons-animation-macros loaded')
      return
    }
        
    let t = !!this.match[1] ? parseInt(this.match[1]) : 0
    let pat = new RegExp(makeRegexPatternFrom(this.match[2], false), 'i')
    for (const c of otigons) {
      let found = c.index.find(e => {console.log(e.name); return e.name.match(pat)})
      if (found) {
        c.getEntity(found._id).then(async m => {
          if (!!m) {
            await wait(t)
            m.execute()
          } else
            ui.notifications.warn(`Entry found for '${this.match[2]}', but no macro`)
        })
        return
      }
    }
    ui.notifications.warn(`No macro found for '${this.match[2]}'`)
  }
}
