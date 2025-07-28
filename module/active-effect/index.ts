import { GurpsModule } from 'module/gurps-module.js'
import { GurpsActiveEffect } from './gurps-active-effect.js'

function init() {
  CONFIG.ActiveEffect.documentClass = GurpsActiveEffect

  Hooks.on('applyActiveEffect', GurpsActiveEffect._apply)
}

export const ActiveEffect: GurpsModule = { init }

export * from './gurps-active-effect.js'
