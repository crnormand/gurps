import { MigrationEntry } from '@module/migration/types.js'

export interface GurpsModule {
  init: () => void
  migrations?: MigrationEntry[]
}
