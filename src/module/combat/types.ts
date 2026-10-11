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

export type CombatOptionSection = 'melee' | 'ranged' | 'defense'

export interface CombatOption {
  /** Stable key. Doubles as the `GURPS.modifiers_.<id>` and `GURPS.modifiers_.pdf.<id>` lookup. */
  id: string
  section: CombatOptionSection
  /** Signed modifier as it is rendered, including the en-dash entries the original list used. */
  mod: string
  /** Appended inside the OTF, e.g. the `*Max:9` cap on Move and Attack. */
  suffix?: string
  /** Only offered when the Use On Target setting is on. */
  requiresOnTarget?: boolean
  /**
   * Keys from `Maneuvers` (module/combat/maneuver.js) that this modifier defines: +4 to hit *is*
   * All-Out Attack (Determined). Such a modifier has no switch of its own -- it is shown while any
   * maneuver it defines is in play and hidden once none are. Most entries are attack/defense *options*
   * layered on top of a maneuver rather than maneuvers, so they map to nothing and have a checkbox.
   */
  maneuvers?: string[]
}

/**
 * What a GM has adopted: which maneuvers are in play, and which of the stand-alone attack/defense
 * options are offered in the Modifier Bucket. A key absent from either map is enabled, so anything
 * added in a later release defaults to visible rather than silently off in existing worlds.
 */
export interface CombatOptionSettings {
  maneuvers?: Record<string, boolean>
  options?: Record<string, boolean>
}

/**
 * The maneuvers with no meaningful "off": Do Nothing is what the system falls back to when an actor
 * has no maneuver at all, and Move is the baseline every other maneuver is described against. The
 * Combat Options dialog doesn't offer them, and a settings object that turns them off anyway --
 * written by an older build, or by hand -- is overruled rather than obeyed, because a world with no
 * Do Nothing in play gives a player no way to pick it back.
 */
export const ALWAYS_IN_PLAY = ['do_nothing', 'move']
