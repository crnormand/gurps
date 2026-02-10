import { fields } from '@gurps-types/foundry/index.js'

import { MapField } from '../data/fields/map-field.js'

// const SETTINGS = 'GURPS.scriptResovler.settings.title'

import { GLOBAL_RESOLVER_CACHE } from './types.js'

export function registerSettings(): void {
  if (!game.settings || !game.i18n)
    throw new Error('GURPS | Scripting module requires game.settings and game.i18n to be available!')

  game.settings.register(GURPS.SYSTEM_NAME, GLOBAL_RESOLVER_CACHE, {
    name: 'GURPS.scriptResolver.settings.globalResolverCache.name',
    hint: 'GURPS.scriptResolver.settings.globalResolverCache.hint',
    scope: 'world',
    config: false,
    type: new MapField(
      new fields.StringField({ required: true, nullable: false }),
      new MapField(
        new fields.StringField({ required: true, nullable: false }),
        new fields.StringField({ required: true, nullable: false }),
        { required: true, nullable: false }
      ),
      { required: true, nullable: false }
    ),
  })
}
