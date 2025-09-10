import { GurpsModule } from 'module/gurps-module.js'
import { GurpsActiveEffect } from './gurps-active-effect.js'
import { GurpsActiveEffectConfig } from './active-effect-config.js'

interface ActiveEffectModule extends GurpsModule {
  clearEffectsOnSelectedToken: typeof GurpsActiveEffect.clearEffectsOnSelectedToken
}

function init() {
  Hooks.on('init', () => {
    CONFIG.ActiveEffect.documentClass = GurpsActiveEffect

    // add custom ActiveEffectConfig sheet class
    foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
      foundry.documents.ActiveEffect,
      'core',
      foundry.applications.sheets.ActiveEffectConfig
    )
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect,
      'gurps',
      GurpsActiveEffectConfig,
      {
        makeDefault: true,
      }
    )
  })

  Hooks.on('applyActiveEffect', GurpsActiveEffect._apply)
}

export const ActiveEffect: ActiveEffectModule = {
  init,
  clearEffectsOnSelectedToken: GurpsActiveEffect.clearEffectsOnSelectedToken,
}

export * from './gurps-active-effect.js'
