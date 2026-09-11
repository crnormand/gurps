import { COMBAT_OPTIONS, CombatOptionSection, enabledOptions } from '@module/combat/combat-options.js'

const SECTIONS: CombatOptionSection[] = ['melee', 'ranged', 'defense']

describe('COMBAT_OPTIONS ordering', () => {
  // RangedMods emits the "On Target" sub-heading when an option's requiresOnTarget differs from its
  // predecessor's, so an On Target entry slipped into the middle of a section would emit a second one.
  it('groups the On Target options of every section into a single run at the end', () => {
    const interleaved = SECTIONS.filter(section => {
      const flags = COMBAT_OPTIONS.filter(option => option.section === section).map(option =>
        Number(!!option.requiresOnTarget)
      )

      return flags.some((flag, index) => index > 0 && flag < flags[index - 1])
    })

    expect(interleaved).toEqual([])
  })

  it('gives every option a unique id', () => {
    const ids = COMBAT_OPTIONS.map(option => option.id)

    expect(ids).toHaveLength(new Set(ids).size)
  })
})

describe('enabledOptions', () => {
  it('returns only options from the requested section', () => {
    const ids = enabledOptions('melee', { useOnTarget: false }).map(option => option.id)

    expect(ids).toEqual(
      COMBAT_OPTIONS.filter(option => option.section === 'melee' && !option.requiresOnTarget).map(option => option.id)
    )
  })

  test('On Target is disabled', () => {
    const ids = enabledOptions('ranged', { useOnTarget: false }).map(option => option.id)

    expect(ids).not.toContain('allOutAim')
  })

  test('On Target is enabled', () => {
    const ids = enabledOptions('ranged', { useOnTarget: true }).map(option => option.id)

    expect(ids).toContain('allOutAim')
  })

  it('includes the Committed Aim defense penalty in the defense section', () => {
    const ids = enabledOptions('defense', { useOnTarget: true }).map(option => option.id)

    expect(ids).toContain('committedAimDefense')
  })
})
