import { GurpsModule } from '@gurps-types/gurps-module.js'

import { migrations } from './migrations/index.js'

function init() {
  console.log('GURPS | Initializing GURPS Chat Module')
}

/* ---------------------------------------- */

export const ChatModule: GurpsModule = {
  init,
  migrations,
}
