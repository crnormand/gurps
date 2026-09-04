import type { GurpsModule } from '@gurps-types/gurps-module.js'

import { actionFunc, actionFuncs } from './actionFuncs.js'

interface OtfModule extends GurpsModule {
  actionFuncs: Record<string, actionFunc>
}

function init() {
  console.log('GURPS | Initializing GURPS OTF module.')
  GURPS.actionFuncs = actionFuncs
}

export const Otf: OtfModule = {
  init,
  actionFuncs,
}