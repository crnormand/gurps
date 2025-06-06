export interface GurpsModule {
  init: () => void
  migrate?: () => void
}
