import { GurpsModule } from '../gurps-module.ts'
import * as PrereqsModule from '../prereqs/index.ts'

function init() {
  console.log('GURPS | Initializing GURPS Data module.')
  Hooks.on('init', () => {
    PrereqsModule.init()
  })
}

export const Data: GurpsModule = {
  init,
}
