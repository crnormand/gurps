export const MODULE_NAME = 'combat'

/**
 * The maneuver settings below predate this module and are already stored in every existing world, so
 * their keys stay unprefixed -- renaming them would silently reset each GM's choices. Only the new
 * Combat Options setting follows the `<module>.<key>` convention (see module/pdf/types.ts).
 */
export const SETTING_COMBAT_OPTIONS = `${MODULE_NAME}.options`
export const SETTING_USE_ON_TARGET = 'use-on-target'
export const SETTING_MANEUVER_VISIBILITY = 'maneuver-visibility'
export const SETTING_MANEUVER_DETAIL = 'maneuver-detail'
export const SETTING_MANEUVER_UPDATES_MOVE = 'maneuver-updates-move'
export const SETTING_ALLOW_ROLL_BASED_ON_MANEUVER = 'allow-roll-based-on-maneuver'
