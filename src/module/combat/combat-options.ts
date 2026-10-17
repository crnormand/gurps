import type { CombatOption, CombatOptionSection, CombatOptionSettings } from './types.js'

/**
 * Registry of the attack and defense options (B365, B374, MA99-100, Pyramid #3/77) shown in the
 * Modifier Bucket's Melee Attack, Ranged and Defense sections.
 *
 * These used to be hardcoded arrays of OTF strings in `tooltip-window.js`. They live here so a single
 * list drives both the bucket contents and the Combat Options dialog that toggles them.
 */

export const COMBAT_OPTIONS: readonly CombatOption[] = [
  // --- Melee Attack (B365, MA99-100, MA113, B369-370) ---
  { id: 'aoaDetermined', section: 'melee', mod: '+4', maneuvers: ['aoa_determined'], rollTypes: ['allMeleeRolls'] },
  { id: 'aoaStrong', section: 'melee', mod: '+2', maneuvers: ['aoa_strong'], rollTypes: ['allDamageRolls'] },
  // Committed Attack (MA99) has no melee maneuver of its own; only the On Target ranged variants exist.
  { id: 'committedDetermined', section: 'melee', mod: '+2', rollTypes: ['allMeleeRolls'] },
  { id: 'committedStrong', section: 'melee', mod: '+1', rollTypes: ['allDamageRolls'] },
  { id: 'telegraphic', section: 'melee', mod: '+4', rollTypes: ['allMeleeRolls'] },
  {
    id: 'moveAndAttack',
    section: 'melee',
    mod: '-4',
    suffix: ' *Max:9',
    maneuvers: ['move_and_attack'],
    rollTypes: ['allMeleeRolls'],
  },
  { id: 'deceptive', section: 'melee', mod: '-2', rollTypes: ['allMeleeRolls'] },
  { id: 'defensive', section: 'melee', mod: '-2', rollTypes: ['allMeleeRolls'] },
  { id: 'rapidStrike', section: 'melee', mod: '-6', rollTypes: ['allMeleeRolls'] },

  // --- Ranged (B364, B365, B390) ---
  { id: 'aim', section: 'ranged', mod: '+1', maneuvers: ['aim'], rollTypes: ['allRangedRolls'] },
  { id: 'popup', section: 'ranged', mod: '–2', rollTypes: ['allRangedRolls'] },
  { id: 'aoaRangedDetermined', section: 'ranged', mod: '+1', maneuvers: ['aoa_ranged'], rollTypes: ['allRangedRolls'] },

  // --- Ranged, On Target (Pyramid #3/77) ---
  {
    id: 'aoaRanged',
    section: 'ranged',
    mod: '+2',
    requiresOnTarget: true,
    maneuvers: ['aoa_ranged'],
    rollTypes: ['allRangedRolls'],
  },
  {
    id: 'committedRanged',
    section: 'ranged',
    mod: '+1',
    requiresOnTarget: true,
    maneuvers: ['committed_attack_ranged'],
    rollTypes: ['allRangedRolls'],
  },
  {
    id: 'allOutAim',
    section: 'ranged',
    mod: '+4',
    requiresOnTarget: true,
    maneuvers: ['allout_aim'],
    rollTypes: ['allRangedRolls'],
  },
  {
    id: 'allOutAimBraced',
    section: 'ranged',
    mod: '+2',
    requiresOnTarget: true,
    maneuvers: ['allout_aim'],
    rollTypes: ['allRangedRolls'],
  },
  {
    id: 'committedAim',
    section: 'ranged',
    mod: '+2',
    requiresOnTarget: true,
    maneuvers: ['committed_aim'],
    rollTypes: ['allRangedRolls'],
  },
  {
    id: 'committedAimBraced',
    section: 'ranged',
    mod: '+1',
    requiresOnTarget: true,
    maneuvers: ['committed_aim'],
    rollTypes: ['allRangedRolls'],
  },

  // --- Defense (B366, B374, B377, B390, MA100, MA124) ---
  // Increased Defense (B366) is +2 to one of Dodge/Parry/Block; Double Defense is the separate
  // aod_double maneuver, so this option does not gate it.
  {
    id: 'aodIncreased',
    section: 'defense',
    mod: '+2',
    maneuvers: ['aod_dodge', 'aod_parry', 'aod_block'],
    rollTypes: ['allDefenseRolls'],
  },
  { id: 'shieldDB', section: 'defense', mod: '+1', rollTypes: ['allDefenseRolls'] },
  { id: 'dodgeAcrobatic', section: 'defense', mod: '+2', rollTypes: ['allDODGERolls'] },
  { id: 'dodgeAndDrop', section: 'defense', mod: '+3', rollTypes: ['allDODGERolls'] },
  { id: 'dodgeRetreat', section: 'defense', mod: '+3', rollTypes: ['allDODGERolls'] },
  { id: 'blockRetreat', section: 'defense', mod: '+1', rollTypes: ['allBlockRolls'] },
  { id: 'fencingRetreat', section: 'defense', mod: '+3', rollTypes: ['allParryRolls'] },
  { id: 'defensiveDefense', section: 'defense', mod: '+1', rollTypes: ['allDefenseRolls'] },
  { id: 'dodgeAcrobaticFail', section: 'defense', mod: '-2', rollTypes: ['allDODGERolls'] },
  { id: 'defenseSide', section: 'defense', mod: '-2', rollTypes: ['allDefenseRolls'] },
  { id: 'deceptiveDefense', section: 'defense', mod: '-1', rollTypes: ['allDefenseRolls'] },
  { id: 'riposte', section: 'defense', mod: '–1', rollTypes: ['allParryRolls'] },

  // --- Defense, On Target (Pyramid #3/77) ---
  {
    id: 'committedAimDefense',
    section: 'defense',
    mod: '-2',
    requiresOnTarget: true,
    maneuvers: ['committed_aim'],
    rollTypes: ['allDefenseRolls'],
  },
  {
    id: 'committedAttackRanged',
    section: 'defense',
    mod: '-2',
    requiresOnTarget: true,
    maneuvers: ['committed_attack_ranged'],
    rollTypes: ['allDefenseRolls'],
  },
  // ---Extra Effort
  {
    id: 'feverishDefense',
    section: 'extraEffort',
    mod: '+2',
    rollTypes: ['allDefenseRolls'],
    suffix: ' *Cost 1FP',
  },
  {
    id: 'mightyBlow',
    section: 'extraEffort',
    mod: '+2',
    rollTypes: ['allDamageRolls'],
    suffix: ' *Cost 1FP',
  },
  {
    id: 'heroicCharge',
    section: 'extraEffort',
    mod: '+0',
    rollTypes: ['allAttackRolls'],
    suffix: ' *Cost 1FP',
  },
  {
    id: 'flurryOfBlows',
    section: 'extraEffort',
    mod: '-3',
    rollTypes: ['allMeleeRolls'],
    suffix: ' *Cost 1FP',
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

/** The options a GM is offered a checkbox for: the ones no maneuver defines. */
export function configurableOptions(): CombatOption[] {
  return COMBAT_OPTIONS.filter(option => !definesManeuver(option))
}

const definesManeuver = (option: CombatOption): boolean => (option.maneuvers?.length ?? 0) > 0

/**
 * A modifier that defines a maneuver follows that maneuver: it is shown while any maneuver it defines
 * is in play, whatever the options map says. Turning off All-Out Defense (Dodge) takes "+2 to defense
 * (AoD: Increased)" with it, unless (Parry) or (Block) is still in play. Any other modifier is shown
 * until its own checkbox is turned off.
 */
export function isOptionEnabled(id: string, settings: CombatOptionSettings): boolean {
  const option = COMBAT_OPTIONS.find(it => it.id === id)

  if (!option) return false

  if (definesManeuver(option)) return option.maneuvers!.some(name => isManeuverEnabled(name, settings))

  return settings.options?.[id] !== false
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

export function allEnabledOptions(
  settings: CombatOptionSettings,
  { useOnTarget }: { useOnTarget: boolean }
): CombatOption[] {
  return COMBAT_OPTIONS.filter(
    option => (useOnTarget || !option.requiresOnTarget) && isOptionEnabled(option.id, settings)
  )
}