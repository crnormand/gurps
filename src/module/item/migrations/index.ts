import { MigrationEntry } from '@module/migration/types.js'
import { AnyMutableObject } from 'fvtt-types/utils'

import { v1_0_0 } from './v1_0_0.js'

/* ---------------------------------------- */

interface ItemMigrationEntry extends MigrationEntry {
  migrateItemSource(source: AnyMutableObject): AnyMutableObject
}

/* ---------------------------------------- */

export const migrations: ItemMigrationEntry[] = [v1_0_0]
