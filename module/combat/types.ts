/**
 * These settings predate this module and are already stored in every existing world, so their keys
 * stay unprefixed -- adopting the `<module>.<key>` convention (see module/pdf/types.ts) here would
 * silently reset each GM's choices.
 */
export const SETTING_USE_ON_TARGET = 'use-on-target'
export const SETTING_MANEUVER_VISIBILITY = 'maneuver-visibility'
export const SETTING_MANEUVER_DETAIL = 'maneuver-detail'
export const SETTING_MANEUVER_UPDATES_MOVE = 'maneuver-updates-move'
export const SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = 'allow-roll-based-on-maneuver'
