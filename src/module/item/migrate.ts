import { AnyMutableObject } from 'fvtt-types/utils'

import { migrations } from './migrations/index.js'

/* ---------------------------------------- */

export function runSourceMigrations(source: AnyMutableObject): AnyMutableObject {
  let systemVersion = '0.0.0'

  if (
    source?._stats &&
    typeof source._stats === 'object' &&
    'systemVersion' in source._stats &&
    typeof source._stats.systemVersion === 'string'
  ) {
    systemVersion = source._stats.systemVersion
  }

  for (const entry of migrations) {
    if (foundry.utils.isNewerVersion(entry.version, systemVersion)) {
      entry.migrateItemSource(source)
    }
  }

  return source
}
