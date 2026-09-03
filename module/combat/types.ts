export const MODULE_NAME = 'combat'

export const OLD_SETTING_USE_ON_TARGET = 'use-on-target'
export const OLD_SETTING_MANEUVER_VISIBILITY = 'maneuver-visibility'
export const OLD_SETTING_MANEUVER_DETAIL = 'maneuver-detail'
export const OLD_SETTING_MANEUVER_UPDATES_MOVE = 'maneuver-updates-move'
export const OLD_SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = 'allow-roll-based-on-maneuver'
export const OLD_SETTING_INITIATIVE_FORMULA = 'initiative-formula'
export const OLD_SETTING_RANGE_STRATEGY = 'rangeStrategy'
export const OLD_SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE = 'use-size-modifier-difference-in-melee'

export const SETTING_USE_ON_TARGET = `${MODULE_NAME}.${OLD_SETTING_USE_ON_TARGET}`
export const SETTING_MANEUVER_VISIBILITY = `${MODULE_NAME}.${OLD_SETTING_MANEUVER_VISIBILITY}`
export const SETTING_MANEUVER_DETAIL = `${MODULE_NAME}.${OLD_SETTING_MANEUVER_DETAIL}`
export const SETTING_MANEUVER_UPDATES_MOVE = `${MODULE_NAME}.${OLD_SETTING_MANEUVER_UPDATES_MOVE}`
export const SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = `${MODULE_NAME}.${OLD_SETTING_ALLOW_ROLL_BASED_ON_MANEUVER}`
export const SETTING_INITIATIVE_FORMULA = `${MODULE_NAME}.${OLD_SETTING_INITIATIVE_FORMULA}`
export const SETTING_RANGE_STRATEGY = `${MODULE_NAME}.${OLD_SETTING_RANGE_STRATEGY}`
export const SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE = `${MODULE_NAME}.${OLD_SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE}`

export const SETTINGS = 'GURPS.combat.setting'
export const ICON = 'fa-solid fa-swords'

export type RollBasedOnManeuverPolicy = 'Allow' | 'Forbid' | 'Warn'
export type ManeuverDetail = 'Full' | 'General' | 'NoFeint'
export type ManeuverVisibility = 'NoOne' | 'Everyone' | 'GMAndOwner'
export type RangeStrategy = 'Standard' | 'Simplified' | 'TenPenalties'
