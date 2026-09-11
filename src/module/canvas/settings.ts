import { fields } from '@gurps-types/foundry/index.js'

import { USE_BOOK_REGION_RADIUS } from './types.js'

export function registerSettings() {
  if (!game.settings || !_loc)
    throw new Error('GURPS | Canvas module requires game.settings and game.i18n to be available!')

  /* ---------------------------------------- */

  // Register new settings
  game.settings.register(GURPS.SYSTEM_NAME, USE_BOOK_REGION_RADIUS, {
    name: _loc('GURPS.canvas.settings.useBookRegionRadius.name'),
    hint: _loc('GURPS.canvas.settings.useBookRegionRadius.hint'),
    scope: 'world',
    config: true,
    type: new fields.BooleanField(),
    onChange: value => console.log(`Use Book Region Radius : ${value ? 'Enabled' : 'Disabled'}`),
  })
}
