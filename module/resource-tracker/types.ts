// TODO New setting names:
// - SETTING_TRACKER_DEFAULT_EDITOR ('tracker-manager') becomes 'tracker.manager'
// - SETTING_TRACKER_TEMPLATES ('tracker-templates') becomes 'tracker.templates'

// README: By Convention, settings should be prefixed with the module name.
const SettingPrefix = 'resource-tracker'
const editorName = 'manager'
const templateName = 'templates'

export const SETTING_TRACKER_EDITOR = `${SettingPrefix}.${editorName}`
export const SETTING_TRACKER_TEMPLATES = `${SettingPrefix}.${templateName}`

export type ResourceTrackerThreshold = {
  comparison: string
  operator: string
  value: number
  condition: string
  color: string
}

export type ResourceTrackerTemplate = {
  tracker: {
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
  initialValue: string
}
