import { fields } from '@gurps-types/foundry/index.js'

import { NON_PRODUCTION_DOCUMENT_TYPES, SHOW_DEBUG_INFO } from './types.ts'

export function registerSettings() {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Dev module requires game.settings and game.i18n to be available!')

  /* ---------------------------------------- */

  // Register new settings
  game.settings.register(GURPS.SYSTEM_NAME, NON_PRODUCTION_DOCUMENT_TYPES, {
    name: '', // Not displayed in the UI.
    hint: '',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    onChange: value => console.log(`Non-production document types : ${value ? 'ENABLED' : 'DISABLED'}`),
  })

  game.settings.register(GURPS.SYSTEM_NAME, SHOW_DEBUG_INFO, {
    name: '', // Not displayed in the UI.
    hint: '',
    scope: 'world',
    config: false,
    type: new fields.BooleanField(),
    onChange: value => console.log(`Show Debug Info : ${value ? 'ENABLED' : 'DISABLED'}`),
  })
}
