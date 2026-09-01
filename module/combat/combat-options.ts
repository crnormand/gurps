/**
 * Registry of the attack and defense options (B365, B374, MA99-100, Pyramid #3/77) shown in the
 * Modifier Bucket's Melee Attack, Ranged and Defense sections.
 *
 * These used to be hardcoded arrays of OTF strings in `tooltip-window.js`. They live here so a single
 * list drives both the bucket contents and the Combat Options dialog that toggles them.
 */

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
   * Keys from `Maneuvers` (module/actor/maneuver.js) that this modifier represents. A modifier is
   * hidden once every maneuver it represents has been turned off -- most entries are attack/defense
   * *options* rather than maneuvers, so they map to nothing and are only ever hidden on their own.
   */
  maneuvers?: string[]
}

/**
 * What a GM has adopted: which maneuvers are in play, and which of their attack/defense options are
 * offered in the Modifier Bucket. A key absent from either map is enabled, so anything added in a
 * later release defaults to visible rather than silently off in existing worlds.
 */
export interface CombatOptionSettings {
  maneuvers?: Record<string, boolean>
  options?: Record<string, boolean>
}

export const COMBAT_OPTIONS: readonly CombatOption[] = [
  // --- Melee Attack (B365, MA99-100, MA113, B369-370) ---
  { id: 'aoaDetermined', section: 'melee', mod: '+4', maneuvers: ['aoa_determined'] },
  { id: 'aoaStrong', section: 'melee', mod: '+2', maneuvers: ['aoa_strong'] },
  // Committed Attack (MA99) has no melee maneuver of its own; only the On Target ranged variants exist.
  { id: 'committedDetermined', section: 'melee', mod: '+2' },
  { id: 'committedStrong', section: 'melee', mod: '+1' },
  { id: 'telegraphic', section: 'melee', mod: '+4' },
  { id: 'moveAndAttack', section: 'melee', mod: '-4', suffix: ' *Max:9', maneuvers: ['move_and_attack'] },
  { id: 'deceptive', section: 'melee', mod: '-2' },
  { id: 'defensive', section: 'melee', mod: '-2' },
  { id: 'rapidStrike', section: 'melee', mod: '-6' },

  // --- Ranged (B364, B365, B390) ---
  { id: 'aim', section: 'ranged', mod: '+1', maneuvers: ['aim'] },
  { id: 'popup', section: 'ranged', mod: '–2' },
  { id: 'aoaRangedDetermined', section: 'ranged', mod: '+1', maneuvers: ['aoa_ranged'] },

  // --- Ranged, On Target (Pyramid #3/77) ---
  { id: 'aoaRanged', section: 'ranged', mod: '+2', requiresOnTarget: true, maneuvers: ['aoa_ranged'] },
  {
    id: 'committedRanged',
    section: 'ranged',
    mod: '+1',
    requiresOnTarget: true,
    maneuvers: ['committed_attack_ranged'],
  },
  { id: 'allOutAim', section: 'ranged', mod: '+4', requiresOnTarget: true, maneuvers: ['allout_aim'] },
  { id: 'allOutAimBraced', section: 'ranged', mod: '+2', requiresOnTarget: true, maneuvers: ['allout_aim'] },
  { id: 'committedAim', section: 'ranged', mod: '+2', requiresOnTarget: true, maneuvers: ['committed_aim'] },
  { id: 'committedAimBraced', section: 'ranged', mod: '+1', requiresOnTarget: true, maneuvers: ['committed_aim'] },

  // --- Defense (B366, B374, B377, B390, MA100, MA124) ---
  // Increased Defense (B366) is +2 to one of Dodge/Parry/Block; Double Defense is the separate
  // aod_double maneuver, so this option does not gate it.
  { id: 'aodIncreased', section: 'defense', mod: '+2', maneuvers: ['aod_dodge', 'aod_parry', 'aod_block'] },
  { id: 'shieldDB', section: 'defense', mod: '+1' },
  { id: 'dodgeAcrobatic', section: 'defense', mod: '+2' },
  { id: 'dodgeAndDrop', section: 'defense', mod: '+3' },
  { id: 'dodgeRetreat', section: 'defense', mod: '+3' },
  { id: 'blockRetreat', section: 'defense', mod: '+1' },
  { id: 'fencingRetreat', section: 'defense', mod: '+3' },
  { id: 'defensiveDefense', section: 'defense', mod: '+1' },
  { id: 'dodgeAcrobaticFail', section: 'defense', mod: '-2' },
  { id: 'defenseSide', section: 'defense', mod: '-2' },
  { id: 'deceptiveDefense', section: 'defense', mod: '-1' },
  { id: 'riposte', section: 'defense', mod: '–1' },

  // --- Defense, On Target (Pyramid #3/77) ---
  {
    id: 'committedAttackRanged',
    section: 'defense',
    mod: '-2',
    requiresOnTarget: true,
    maneuvers: ['committed_attack_ranged'],
  },
  {
    id: 'committedAimDefense',
    section: 'defense',
    mod: '-2',
    requiresOnTarget: true,
    maneuvers: ['committed_aim'],
  },
]

/** Nothing turned off. Used as the setting's default. */
export function defaultCombatOptionSettings(): CombatOptionSettings {
  return { maneuvers: {}, options: {} }
}

/**
 * The maneuvers with no meaningful "off": Do Nothing is what the system falls back to when an actor
 * has no maneuver at all, and Move is the baseline every other maneuver is described against. The
 * Combat Options dialog doesn't offer them, and a settings object that turns them off anyway --
 * written by an older build, or by hand -- is overruled rather than obeyed, because a world with no
 * Do Nothing in play gives a player no way to pick it back.
 */
export const ALWAYS_IN_PLAY = ['do_nothing', 'move']

/** A maneuver stays in play until the GM turns it off in the Combat Options maneuver list. */
export function isManeuverEnabled(maneuverName: string, settings: CombatOptionSettings): boolean {
  if (ALWAYS_IN_PLAY.includes(maneuverName)) return true
  return settings.maneuvers?.[maneuverName] !== false
}

/**
 * A modifier is shown when its own checkbox is on *and* at least one of the maneuvers it represents
 * is still in play. This is the cascade: turning off All-Out Defense (Dodge) takes the "+2 to defense
 * (AoD: Increased)" line with it, unless (Parry) or (Block) is still in play.
 */
export function isOptionEnabled(id: string, settings: CombatOptionSettings): boolean {
  if (settings.options?.[id] === false) return false

  const option = COMBAT_OPTIONS.find(it => it.id === id)
  const maneuvers = option?.maneuvers ?? []

  return maneuvers.length === 0 || maneuvers.some(name => isManeuverEnabled(name, settings))
}

export function enabledOptions(
  section: CombatOptionSection,
  settings: CombatOptionSettings,
  { useOnTarget }: { useOnTarget: boolean }
): CombatOption[] {
  return COMBAT_OPTIONS.filter(
    option =>
      option.section === section && (useOnTarget || !option.requiresOnTarget) && isOptionEnabled(option.id, settings)
  )
}
