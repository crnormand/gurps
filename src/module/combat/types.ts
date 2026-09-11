export const MODULE_NAME = 'combat'

export const OLD_SETTING_USE_ON_TARGET = 'use-on-target'
export const OLD_SETTING_MANEUVER_VISIBILITY = 'maneuver-visibility'
export const OLD_SETTING_MANEUVER_DETAIL = 'maneuver-detail'
export const OLD_SETTING_MANEUVER_UPDATES_MOVE = 'maneuver-updates-move'
export const OLD_SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = 'allow-roll-based-on-maneuver'
export const OLD_SETTING_INITIATIVE_FORMULA = 'initiative-formula'
export const OLD_SETTING_RANGE_STRATEGY = 'rangeStrategy'
export const OLD_SETTING_USE_SIZE_MODIFIER_DIFFERENCE_IN_MELEE = 'use-size-modifier-difference-in-melee'

export const SETTINGS = 'GURPS.combat.setting'
export const ICON = 'fa-solid fa-swords'

export type RollBasedOnManeuverPolicy = 'Allow' | 'Forbid' | 'Warn'
export type ManeuverDetail = 'Full' | 'General' | 'NoFeint'
export type ManeuverVisibility = 'NoOne' | 'Everyone' | 'GMAndOwner'
export type RangeStrategy = 'Standard' | 'Simplified' | 'TenPenalties'
