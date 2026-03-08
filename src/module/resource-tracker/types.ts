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
  initialValue: string | null
  thresholds: IResourceTrackerThreshold[]
}

export interface IResourceTrackerTemplate {
  tracker: IResourceTracker
  autoapply: boolean
  initialValue: string | null
  name: string
  id: string
}

export const TrackerOperators = {
  PLUS: '+',
  MINUS: '\u002D',
  UNICODE_MINUS_SIGN: '\u2212',
  MULTIPLY: '×',
  DIVIDE: '÷',
} as const

export const TrackerComparators = {
  LT: '<',
  LTE: '≤',
  EQ: '=',
  GTE: '≥',
  GT: '>',
} as const

export type TrackerOperators = (typeof TrackerOperators)[keyof typeof TrackerOperators]
export type TrackerComparisons = (typeof TrackerComparators)[keyof typeof TrackerComparators]
type binomialFunction = (left: number, right: number) => number
type comparisonFunction = (left: number, right: number) => boolean

export const OperatorFunctions: Record<TrackerOperators, binomialFunction> = {
  [TrackerOperators.PLUS]: (left: number, right: number) => left + right,
  [TrackerOperators.MINUS]: (left: number, right: number) => left - right,
  [TrackerOperators.UNICODE_MINUS_SIGN]: (left: number, right: number) => left - right,
  [TrackerOperators.MULTIPLY]: (left: number, right: number) => left * right,
  [TrackerOperators.DIVIDE]: (left: number, right: number) => left / right,
} as const

export const ComparisonFunctions: Record<TrackerComparisons, comparisonFunction> = {
  [TrackerComparators.LT]: (left: number, right: number) => left < right,
  [TrackerComparators.LTE]: (left: number, right: number) => left <= right,
  [TrackerComparators.EQ]: (left: number, right: number) => left === right,
  [TrackerComparators.GTE]: (left: number, right: number) => left >= right,
  [TrackerComparators.GT]: (left: number, right: number) => left > right,
} as const
