import { AnyMutableObject } from 'fvtt-types/utils'

import { migrations } from './migrations/index.js'

/* ---------------------------------------- */

export function runSourceMigrations(source: AnyMutableObject): AnyMutableObject {
  let systemVersion: string | null = null

  if (
    source?._stats &&
    typeof source._stats === 'object' &&
    'systemVersion' in source._stats &&
    typeof source._stats.systemVersion === 'string'
  ) {
    systemVersion = source._stats.systemVersion
  }

  if (systemVersion === null) return source

  for (const entry of migrations) {
    if (foundry.utils.isNewerVersion(entry.version, systemVersion)) {
      entry.migrateActorSource(source)
    }
  }

  return source
}
