/**
 * Central export for the CharacterSchema type.
 *
 * This re-exports the `CharacterSchema` type defined in `character.ts` so other
 * modules can import it without pulling in runtime code, e.g.:
 *   import type { CharacterSchema } from 'module/actor/data/character-schema.js'
 */
export type { CharacterSchema } from './character.js'
