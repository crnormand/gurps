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
  tracker: IResourceTracker
  autoapply: boolean
  initialValue: string | null
  name: string
  id: string
}

export type IResourceTrackerTemplateMap = Record<string, IResourceTrackerTemplate>

export interface IThresholdDescriptor {
  value: number
  condition: string
}
