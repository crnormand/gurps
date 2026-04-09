import { MigrationEntry } from '@module/migration/types.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { v1_0_0 } from './1_0_0.js'

/* ---------------------------------------- */

interface ActorMigrationEntry extends MigrationEntry {
  migrateActorSource(source: AnyMutableObject): AnyMutableObject
}

/* ---------------------------------------- */

export const migrations: ActorMigrationEntry[] = [v1_0_0]
