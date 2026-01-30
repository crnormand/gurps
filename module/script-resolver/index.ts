import { GurpsModule } from 'module/gurps-module.js'

import { executeScript } from './execute-script.ts'
import { Resolver } from './resolver.ts'
import { registerSettings } from './settings.ts'

interface ScriptResolverModule extends GurpsModule {
  resolver: Resolver
  executeScript: typeof executeScript
}

function init(): void {
  console.log('GURPS | Initializing Script Resolver module.')
  Hooks.on('init', () => {
    registerSettings()
  })
}

export const ScriptResolver: ScriptResolverModule = {
  init,
  resolver: Resolver,
  executeScript,
}
