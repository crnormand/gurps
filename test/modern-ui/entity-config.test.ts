import { entityConfigurations, modifierConfigurations } from '../../module/actor/modern/entity-config.ts'

describe('entityConfigurations', () => {
  test('contains 5 entity types', () => {
    expect(entityConfigurations).toHaveLength(5)
  })

  test('all configs have required properties', () => {
    const requiredProps = ['entityName', 'path', 'editMethod', 'localeKey']

    entityConfigurations.forEach(config => {
      requiredProps.forEach(prop => {
        expect(config).toHaveProperty(prop)
      })
    })
  })

  test.each([
    ['skill', 'system.skills', 'editSkills', 'GURPS.skill'],
    ['trait', 'system.ads', 'editAds', 'GURPS.advantage'],
    ['spell', 'system.spells', 'editSpells', 'GURPS.spell'],
    ['melee', 'system.melee', 'editMelee', 'GURPS.melee'],
    ['ranged', 'system.ranged', 'editRanged', 'GURPS.ranged'],
  ])('config for %s has correct path and edit method', (entityName, expectedPath, expectedMethod, expectedLocale) => {
    const config = entityConfigurations.find(c => c.entityName === entityName)

    expect(config).toBeDefined()
    expect(config!.path).toBe(expectedPath)
    expect(config!.editMethod).toBe(expectedMethod)
    expect(config!.localeKey).toBe(expectedLocale)
  })

  test('all paths start with system.', () => {
    entityConfigurations.forEach(config => {
      expect(config.path).toMatch(/^system\./)
    })
  })

  describe('createArgs', () => {
    test('skill createArgs returns name and level', () => {
      const config = entityConfigurations.find(c => c.entityName === 'skill')
      const args = config!.createArgs!()

      expect(args).toHaveLength(2)
      expect(args[0]).toBe('GURPS.skill')
      expect(args[1]).toBe('10')
    })

    test('spell createArgs returns name and level', () => {
      const config = entityConfigurations.find(c => c.entityName === 'spell')
      const args = config!.createArgs!()

      expect(args).toHaveLength(2)
      expect(args[0]).toBe('GURPS.spell')
      expect(args[1]).toBe('10')
    })

    test('melee createArgs returns name, level, and damage', () => {
      const config = entityConfigurations.find(c => c.entityName === 'melee')
      const args = config!.createArgs!()

      expect(args).toHaveLength(3)
      expect(args[0]).toBe('GURPS.melee')
      expect(args[1]).toBe('10')
      expect(args[2]).toBe('1d')
    })

    test('ranged createArgs returns name, level, and damage', () => {
      const config = entityConfigurations.find(c => c.entityName === 'ranged')
      const args = config!.createArgs!()

      expect(args).toHaveLength(3)
      expect(args[0]).toBe('GURPS.ranged')
      expect(args[1]).toBe('10')
      expect(args[2]).toBe('1d')
    })

    test('trait has no createArgs', () => {
      const config = entityConfigurations.find(c => c.entityName === 'trait')

      expect(config!.createArgs).toBeUndefined()
    })
  })
})

describe('modifierConfigurations', () => {
  test('contains 2 modifier types', () => {
    expect(modifierConfigurations).toHaveLength(2)
  })

  test('first is reaction, second is conditional', () => {
    expect(modifierConfigurations[0].isReaction).toBe(true)
    expect(modifierConfigurations[1].isReaction).toBe(false)
  })
})
