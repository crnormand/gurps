import { GurpsModule } from '@gurps-types/gurps-module.js'

import { ScriptInterpreter } from './interpreter.js'
import { ScriptResolver } from './resolver.js'

interface ScriptingModule extends GurpsModule {
  interpreter: typeof ScriptInterpreter
  resolver: typeof ScriptResolver
  // executeScript: typeof executeScript
}

function init(): void {
  console.log('GURPS | Initializing Script Resolver module.')
}

export const Scripting: ScriptingModule = {
  init,
  interpreter: ScriptInterpreter,
  resolver: ScriptResolver,
  // executeScript,
}
