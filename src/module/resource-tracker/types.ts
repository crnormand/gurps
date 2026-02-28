// TODO New setting names:
// - SETTING_TRACKER_DEFAULT_EDITOR ('tracker-manager') becomes 'tracker.manager'
// - SETTING_TRACKER_TEMPLATES ('tracker-templates') becomes 'tracker.templates'

// README: By Convention, settings should be prefixed with the module name.
const SettingPrefix = 'resource-tracker'

export const SETTING_TRACKER_EDITOR = `${SettingPrefix}.manager`
export const SETTING_TRACKER_TEMPLATES = `${SettingPrefix}.templates`
// TODO May be removed when the setting is removed.
export const OLD_SETTING_TEMPLATES = 'tracker-templates'

export interface IResourceTrackerThreshold {
  comparison: string
  operator: string
  value: number
  condition: string
  color: string | null
}

export interface IResourceTracker {
  name: string
  alias: string
  max: number
  min: number
  value: number
  pdf: string
  isDamageType: boolean
  isAccumulator: boolean
  isMaxEnforced: boolean
  isMinEnforced: boolean
  useBreakpoints: boolean
  thresholds: IResourceTrackerThreshold[]
}

export interface IResourceTrackerTemplate {
  id: string
  name: string
  tracker: IResourceTracker
}

export interface IThresholdDescriptor {
  value: number
  condition: string
}
