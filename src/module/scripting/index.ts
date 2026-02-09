import { GurpsModule } from 'module/gurps-module.js'

import { ScriptInterpreter } from './interpreter.ts'
import { ScriptResolver } from './resolver.ts'
import { registerSettings } from './settings.ts'

interface ScriptingModule extends GurpsModule {
  interpreter: typeof ScriptInterpreter
  resolver: typeof ScriptResolver
  // executeScript: typeof executeScript
}

function init(): void {
  console.log('GURPS | Initializing Script Resolver module.')
  Hooks.on('init', () => {
    registerSettings()
  })
}

export const Scripting: ScriptingModule = {
  init,
  interpreter: ScriptInterpreter,
  resolver: ScriptResolver,
  // executeScript,
}
