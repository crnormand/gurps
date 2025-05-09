export {}

declare global {
  var GURPS: any

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
  }
}
