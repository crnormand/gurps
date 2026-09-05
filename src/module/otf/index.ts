import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { executeOTF, performAction } from './executeOTF.js'
import { parselink } from './parselink.js'

interface OtfModule extends GurpsModule {
  performAction: typeof performAction
  parselink: typeof parselink
  executeOTF: typeof executeOTF
}

function init() {
  console.log('GURPS | Initializing GURPS OTF module.')
  GURPS.parselink = parselink
  GURPS.performAction = performAction
  GURPS.executeOTF = executeOTF
}

export const Otf: OtfModule = {
  init,
  performAction,
  parselink,
  executeOTF,
}