import { ActionType } from '@module/action/types.js'
import { CharacterModel } from '@module/actor/data/character.js'

function makeAttack(type: ActionType, level: number, fullName: string) {
  return {
    type,
    level,
    toDisplayItem: () => ({ fullName }),
  }
}

function makeCharacterWithAttacks(attacks: ReturnType<typeof makeAttack>[]): CharacterModel {
  const character = new CharacterModel()

  Object.defineProperty(character, 'parent', {
    value: { getItemAttacks: () => attacks },
  })

  return character
}

describe('CharacterModel', () => {
  describe('findAttack', () => {
    const melee = makeAttack(ActionType.MeleeAttack, 12, 'Fine Sword')
    const ranged = makeAttack(ActionType.RangedAttack, 14, 'Fine Sword')
    let character: CharacterModel

    beforeEach(() => {
      character = makeCharacterWithAttacks([melee, ranged])
    })

    it.each([
      [true, false, melee],
      [false, true, ranged],
      [true, true, ranged],
    ] as const)('searches the requested attack types (%s, %s)', (isMelee, isRanged, expected) => {
      expect(character.findAttack('Fine Sword', isMelee, isRanged)).toBe(expected)
    })

    it('returns null when neither attack type is selected', () => {
      expect(character.findAttack('Fine Sword', false, false)).toBeNull()
    })

    it('matches names case-insensitively and supports wildcards', () => {
      expect(character.findAttack('f* sword', true, false)).toBe(melee)
    })

    it('returns the matching attack with the highest level', () => {
      const lowerLevel = makeAttack(ActionType.MeleeAttack, 10, 'Sword')
      const higherLevel = makeAttack(ActionType.MeleeAttack, 13, 'Fine Sword')

      character = makeCharacterWithAttacks([lowerLevel, higherLevel])

      expect(character.findAttack('Sword', true, false)).toBe(higherLevel)
    })

    it('prefers the shorter display name when matching attacks have the same level', () => {
      const longerName = makeAttack(ActionType.MeleeAttack, 12, 'Fine Sword')
      const shorterName = makeAttack(ActionType.MeleeAttack, 12, 'Sword')
      
      character = makeCharacterWithAttacks([longerName, shorterName])

      expect(character.findAttack('Sword', true, false)).toBe(shorterName)
    })

    it('returns null when no attack name matches', () => {
      expect(character.findAttack('Bow', true, true)).toBeNull()
    })
  })
})
