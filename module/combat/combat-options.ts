/**
 * Registry of the attack and defense options (B365, B374, MA99-100, Pyramid #3/77) shown in the
 * Modifier Bucket's Melee Attack, Ranged and Defense sections.
 *
 * These used to be hardcoded arrays of OTF strings in `tooltip-window.js`, which made the rendered
 * text the only representation of what options exist.
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
}

export const COMBAT_OPTIONS: readonly CombatOption[] = [
  // --- Melee Attack (B365, MA99-100, MA113, B369-370) ---
  { id: 'aoaDetermined', section: 'melee', mod: '+4' },
  { id: 'aoaStrong', section: 'melee', mod: '+2' },
  { id: 'committedDetermined', section: 'melee', mod: '+2' },
  { id: 'committedStrong', section: 'melee', mod: '+1' },
  { id: 'telegraphic', section: 'melee', mod: '+4' },
  { id: 'moveAndAttack', section: 'melee', mod: '-4', suffix: ' *Max:9' },
  { id: 'deceptive', section: 'melee', mod: '-2' },
  { id: 'defensive', section: 'melee', mod: '-2' },
  { id: 'rapidStrike', section: 'melee', mod: '-6' },

  // --- Ranged (B364, B365, B390) ---
  { id: 'aim', section: 'ranged', mod: '+1' },
  { id: 'popup', section: 'ranged', mod: '–2' },
  { id: 'aoaRangedDetermined', section: 'ranged', mod: '+1' },

  // --- Ranged, On Target (Pyramid #3/77) ---
  { id: 'aoaRanged', section: 'ranged', mod: '+2', requiresOnTarget: true },
  { id: 'committedRanged', section: 'ranged', mod: '+1', requiresOnTarget: true },
  { id: 'allOutAim', section: 'ranged', mod: '+4', requiresOnTarget: true },
  { id: 'allOutAimBraced', section: 'ranged', mod: '+2', requiresOnTarget: true },
  { id: 'committedAim', section: 'ranged', mod: '+2', requiresOnTarget: true },
  { id: 'committedAimBraced', section: 'ranged', mod: '+1', requiresOnTarget: true },

  // --- Defense (B366, B374, B377, B390, MA100, MA124) ---
  { id: 'aodIncreased', section: 'defense', mod: '+2' },
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
  { id: 'committedAttackRanged', section: 'defense', mod: '-2', requiresOnTarget: true },
  { id: 'committedAimDefense', section: 'defense', mod: '-2', requiresOnTarget: true },
]

export function enabledOptions(
  section: CombatOptionSection,
  { useOnTarget }: { useOnTarget: boolean }
): CombatOption[] {
  return COMBAT_OPTIONS.filter(option => option.section === section && (useOnTarget || !option.requiresOnTarget))
}
