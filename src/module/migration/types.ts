export interface MigrationReport {
  module: string
  version?: string
  success: boolean
  message?: string
}

/* ---------------------------------------- */

export interface MigrationEntry {
  version: string
  migrate(): Promise<MigrationReport | void>
}
