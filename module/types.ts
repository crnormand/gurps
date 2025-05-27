export interface GurpsModule {
  init: () => void
  // README: Every module should have a migrate function. If no migration is needed, it can be an empty function.
  migrate: () => void
}
