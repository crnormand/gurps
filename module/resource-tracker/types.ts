// TODO New setting names:
// - SETTING_TRACKER_DEFAULT_EDITOR ('tracker-manager') becomes 'tracker.manager'
// - SETTING_TRACKER_TEMPLATES ('tracker-templates') becomes 'tracker.templates'

// README: By Convention, settings should be prefixed with the module name.
const SettingPrefix = 'resource-tracker'

export const SETTING_TRACKER_EDITOR = `${SettingPrefix}.manager`
export const SETTING_TRACKER_TEMPLATES = `${SettingPrefix}.templates`
// TODO May be removed when the setting is removed.
export const OLD_SETTING_TEMPLATES = 'tracker-templates'

export type ResourceTrackerThreshold = {
  comparison: string
  operator: string
  value: number
  condition: string
  color: string
}

export type ResourceTracker = {
  name: string
  alias: string
  pdf: string
  max: number
  min: number
  value: number
  isDamageType: boolean
  isDamageTracker: boolean
  breakpoints: boolean
  thresholds: ResourceTrackerThreshold[]
}

export type ResourceTrackerTemplate = {
  tracker: ResourceTracker
  initialValue: string
  slot: boolean
}
