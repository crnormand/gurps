import {
  COMBAT_OPTIONS,
  CombatOptionSection,
  defaultCombatOptionSettings,
  enabledOptions,
  isManeuverEnabled,
  ALWAYS_IN_PLAY,
} from '../module/combat/combat-options.js'
import Maneuvers from '../module/combat/maneuver.js'

const SECTIONS: CombatOptionSection[] = ['melee', 'ranged', 'defense']

describe('COMBAT_OPTIONS ordering', () => {
  // RangedMods emits the "On Target" sub-heading when an option's requiresOnTarget differs from its
  // predecessor's, so an On Target entry slipped into the middle of a section would emit a second one.
  it('groups the On Target options of every section into a single run at the end', () => {
    const interleaved = SECTIONS.filter(section => {
      const flags = COMBAT_OPTIONS.filter(o => o.section === section).map(o => Number(!!o.requiresOnTarget))
      return flags.some((flag, index) => index > 0 && flag < flags[index - 1])
    })

    expect(interleaved).toEqual([])
  })

  it('gives every option a unique id', () => {
    const ids = COMBAT_OPTIONS.map(o => o.id)

    expect(ids).toHaveLength(new Set(ids).size)
  })
})

describe('defaultCombatOptionSettings', () => {
  it('turns nothing off', () => {
    expect(defaultCombatOptionSettings()).toEqual({ maneuvers: {}, options: {} })
  })
})

describe('enabledOptions', () => {
  it('returns only options from the requested section', () => {
    const ids = enabledOptions('melee', {}, { useOnTarget: false }).map(o => o.id)

    expect(ids).toEqual(COMBAT_OPTIONS.filter(o => o.section === 'melee' && !o.requiresOnTarget).map(o => o.id))
  })

  it('omits an option that is turned off', () => {
    const ids = enabledOptions('melee', { options: { aoaDetermined: false } }, { useOnTarget: false }).map(o => o.id)

    expect(ids).not.toContain('aoaDetermined')
  })

  it('treats an option missing from the settings object as enabled', () => {
    const ids = enabledOptions('melee', { options: { aoaStrong: false } }, { useOnTarget: false }).map(o => o.id)

    expect(ids).toContain('aoaDetermined')
  })

  test('On Target is disabled', () => {
    const ids = enabledOptions('ranged', {}, { useOnTarget: false }).map(o => o.id)

    expect(ids).not.toContain('allOutAim')
  })

  test('On Target is enabled', () => {
    const ids = enabledOptions('ranged', {}, { useOnTarget: true }).map(o => o.id)

    expect(ids).toContain('allOutAim')
  })

  it('omits an On Target option that is turned off even when On Target is enabled', () => {
    const ids = enabledOptions('ranged', { options: { allOutAim: false } }, { useOnTarget: true }).map(o => o.id)

    expect(ids).not.toContain('allOutAim')
  })

  it('includes the Committed Aim defense penalty in the defense section', () => {
    const ids = enabledOptions('defense', {}, { useOnTarget: true }).map(o => o.id)

    expect(ids).toContain('committedAimDefense')
  })
})

describe('enabledOptions, cascading from a maneuver', () => {
  it('omits a modifier whose only maneuver is turned off', () => {
    const ids = enabledOptions('melee', { maneuvers: { aoa_determined: false } }, { useOnTarget: false }).map(o => o.id)

    expect(ids).not.toContain('aoaDetermined')
  })

  it('keeps a modifier that represents no maneuver at all', () => {
    const ids = enabledOptions('melee', { maneuvers: { aoa_determined: false } }, { useOnTarget: false }).map(o => o.id)

    expect(ids).toContain('telegraphic')
  })

  it('keeps a shared modifier while one of its maneuvers is still enabled', () => {
    const settings = { maneuvers: { aod_dodge: false, aod_parry: false } }
    const ids = enabledOptions('defense', settings, { useOnTarget: false }).map(o => o.id)

    expect(ids).toContain('aodIncreased')
  })

  it('omits a shared modifier once every one of its maneuvers is turned off', () => {
    const settings = { maneuvers: { aod_dodge: false, aod_parry: false, aod_block: false } }
    const ids = enabledOptions('defense', settings, { useOnTarget: false }).map(o => o.id)

    expect(ids).not.toContain('aodIncreased')
  })

  it('omits both All-Out Attack (Ranged) modifiers when that maneuver is turned off', () => {
    const ids = enabledOptions('ranged', { maneuvers: { aoa_ranged: false } }, { useOnTarget: true }).map(o => o.id)

    expect(ids).not.toContain('aoaRanged')
  })

  it('omits the defense modifier of a maneuver whose other modifiers are in another section', () => {
    const settings = { maneuvers: { committed_attack_ranged: false } }
    const ids = enabledOptions('defense', settings, { useOnTarget: true }).map(o => o.id)

    expect(ids).not.toContain('committedAttackRanged')
  })
})

describe('isManeuverEnabled', () => {
  it('returns true for a maneuver that is missing from the settings object', () => {
    expect(isManeuverEnabled('feint', {})).toBe(true)
  })

  it('returns false for a maneuver that is turned off', () => {
    expect(isManeuverEnabled('aoa_determined', { maneuvers: { aoa_determined: false } })).toBe(false)
  })

  it('returns true for a maneuver whose modifiers are all turned off', () => {
    expect(isManeuverEnabled('aoa_determined', { options: { aoaDetermined: false } })).toBe(true)
  })

  test('Do Nothing has been turned off', () => {
    expect(isManeuverEnabled('do_nothing', { maneuvers: { do_nothing: false } })).toBe(true)
  })

  test('Move has been turned off', () => {
    expect(isManeuverEnabled('move', { maneuvers: { move: false } })).toBe(true)
  })
})

describe('ALWAYS_IN_PLAY', () => {
  it('names the maneuvers no GM is offered a checkbox for', () => {
    expect([...ALWAYS_IN_PLAY]).toEqual(['do_nothing', 'move'])
  })

  it('names only maneuvers that exist', () => {
    const everyManeuver = Object.keys(Maneuvers.getAll())

    expect(ALWAYS_IN_PLAY.filter(name => !everyManeuver.includes(name))).toEqual([])
  })

  // The dialog leaves these maneuvers out of its list, so an option gated on one would find no
  // checkbox to read its label or its state from.
  it('names no maneuver that a combat option is gated on', () => {
    const gating = COMBAT_OPTIONS.flatMap(option => option.maneuvers ?? [])

    expect(ALWAYS_IN_PLAY.filter(name => gating.includes(name))).toEqual([])
  })
})
