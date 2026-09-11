import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { setLastTargetedRoll } from './dieroll.js'
import { executeOTF, performAction } from './executeOTF.js'
import { parselink } from './parselink.js'

interface OtfModule extends GurpsModule {
  performAction: typeof performAction
  parselink: typeof parselink
  executeOTF: typeof executeOTF
  setLastTargetedRoll: typeof setLastTargetedRoll
  pendingOTFs: string[]
}

function init() {
  console.log('GURPS | Initializing GURPS OTF module.')
  GURPS.parselink = parselink
  GURPS.performAction = performAction
  GURPS.executeOTF = executeOTF
  Hooks.on('diceSoNiceRollComplete', async (_app: any, _html: any, _msg: any) => {
    let otf = GURPS.modules.Otf.pendingOTFs.pop()

    while (otf) {
      const action = parselink(otf)

      if (action.action) await GURPS.performAction(action.action, GURPS.LastActor ?? null)
      otf = GURPS.modules.Otf.pendingOTFs.pop()
    }
  })
}

export const Otf: OtfModule = {
  init,
  performAction,
  parselink,
  executeOTF,
  setLastTargetedRoll,
  pendingOTFs: [],
}