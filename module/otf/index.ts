import { GurpsModule } from 'module/gurps-module.js'
import { applyModifierDesc } from './description-utilities.js'
import { findBestActionInChain } from './best-action.ts'

function init() {
  console.log('GURPS | Initializing GURPS OTF module.')
  Hooks.on('init', () => {
    GURPS.applyModifierDesc = applyModifierDesc
  })
}

const OtfUtilities = {
  applyModifierDesc,
  findBestActionInChain,
}

export const OtfModule: GurpsModule | typeof OtfUtilities = {
  init,
  applyModifierDesc,
  findBestActionInChain,
}

export { OtfActionType } from './types.js'
