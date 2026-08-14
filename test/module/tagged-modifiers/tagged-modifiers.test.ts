import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'
import { ActionType } from '@module/action/types.js'
import {
  getTagsForRoll,
  getRollTypeFromData,
  ROLL_TYPE,
  taggedModToApply,
} from '@module/tagged-modifiers/tagged-modifiers.js'

const defaultSettings = {
  autoAdd: true,
  checkConditionals: true,
  checkReactions: true,
  useSpellCollegeAsTag: false,
  allRolls: 'all',
  allAttributesRolls: 'attribute',
  allSkillRolls: 'skill',
  allSpellRolls: 'spell',
  allDamageRolls: 'damage',
  allAttackRolls: 'hit',
  allRangedRolls: 'ranged',
  allMeleeRolls: 'melee',
  allDefenseRolls: 'defense',
  allDODGERolls: 'dodge',
  allParryRolls: 'parry',
  allBlockRolls: 'block',
  allPERRolls: 'per',
  allWILLRolls: 'will',
  allSTRolls: 'st',
  allDXRolls: 'dx',
  allIQRolls: 'iq',
  allHTRolls: 'ht',
  allFRIGHTCHECKRolls: 'fright',
  allVISIONRolls: 'vision',
  allTASTESMELLRolls: 'taste, smell',
  allHEARINGRolls: 'hearing',
  allTOUCHRolls: 'touch',
  allCRRolls: 'control',
  combatOnlyTag: 'combat',
  nonCombatOnlyTag: 'no_combat',
  combatTempTag: 'temp',
}

describe('getTagsForRoll', () => {
  test.for([
    [ROLL_TYPE.IQ, 'iq'],
    [ROLL_TYPE.ST, 'st'],
    [ROLL_TYPE.DX, 'dx'],
    [ROLL_TYPE.HT, 'ht'],
  ])('finds the appropriate tag for %s rolls', ([rollType, expected]) => {
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE, {})

    expect(result).toHaveLength(3)
    expect(result).toContain('attribute')
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test.for([
    [ROLL_TYPE.WILL, 'will'],
    [ROLL_TYPE.PER, 'per'],
    [ROLL_TYPE.FRIGHT_CHECK, 'fright'],
    [ROLL_TYPE.HEARING, 'hearing'],
    [ROLL_TYPE.TOUCH, 'touch'],
    [ROLL_TYPE.VISION, 'vision'],
    [ROLL_TYPE.CR, 'control'],
    [ROLL_TYPE.SKILL, 'skill'],
    [ROLL_TYPE.SPELL, 'spell'],
    [ROLL_TYPE.DAMAGE, 'damage'],
  ])('finds the appropriate tag for %s rolls', ([rollType, expected]) => {
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE, {})

    expect(result).toHaveLength(2)
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test('finds the appropriate tag for taste/smell rolls', () => {
    const result = getTagsForRoll(defaultSettings, ROLL_TYPE.TASTE_SMELL, {})

    expect(result).toHaveLength(3)
    expect(result).toContain('taste')
    expect(result).toContain('smell')
    expect(result).toContain('all')
  })

  test.for([
    [ROLL_TYPE.PARRY, 'parry'],
    [ROLL_TYPE.DODGE, 'dodge'],
    [ROLL_TYPE.BLOCK, 'block'],
  ])('finds the appropriate tag for %s rolls', ([rollType, expected]) => {
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE, {})

    expect(result).toHaveLength(3)
    expect(result).toContain('defense')
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test.for([
    [ROLL_TYPE.RANGED, 'ranged'],
    [ROLL_TYPE.MELEE, 'melee'],
  ])('finds the appropriate tag for %s rolls', ([rollType, expected]) => {
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE, {})

    expect(result).toHaveLength(3)
    expect(result).toContain('hit')
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test('adds modifiers from the provided item', () => {
    const item = {
      system: {
        modifierTags: new Set(['itemTag1', 'itemTag2']),
      },
    }
    const result = getTagsForRoll(defaultSettings, ROLL_TYPE.IQ, { obj: item })

    expect(result).toContain('itemTag1')
    expect(result).toContain('itemTag2')
  })

  test('adds spell college from the provided item', () => {
    const item = {
      system: {
        colleges: new Set(['college1', 'college2']),
      },
    }
    const result = getTagsForRoll({ ...defaultSettings, useSpellCollegeAsTag: true }, ROLL_TYPE.SPELL, { obj: item })

    expect(result).toContain('college1')
    expect(result).toContain('college2')
  })

  test('adds spell college from the provided item only for spells', () => {
    const item = {
      system: {
        colleges: new Set(['college1', 'college2']),
      },
    }
    const result = getTagsForRoll({ ...defaultSettings, useSpellCollegeAsTag: true }, ROLL_TYPE.SKILL, { obj: item })

    expect(result).not.toContain('college1')
    expect(result).not.toContain('college2')
  })
})

describe('getRollTypeFromData', () => {
  test.for([
    ['[@YNPi9JgE440B2egj@WILL]', ROLL_TYPE.WILL],
    ['[@TKhYpsMQ4KmECA5z@M:" (Swung)"]', ROLL_TYPE.MELEE],
    ['[@TKhYpsMQ4KmECA5z@R:" (Thrown)"]', ROLL_TYPE.RANGED],
    ['[@TKhYpsMQ4KmECA5z@D:" (Swung)"]', ROLL_TYPE.DAMAGE],
  ])('Extracts Roll Type from chat thing', ([chatThing, expected]) => {
    const result = getRollTypeFromData(chatThing, undefined, {})

    expect(result).toBe(expected)
  })

  test('Returns unknown for invalid chat thing', () => {
    const result = getRollTypeFromData('invalid_chat_thing', undefined, {})

    expect(result).toBe(ROLL_TYPE.UNKNOWN)
  })

  test('Assumes damage roll if no chatthing and no attack is provided', () => {
    const result = getRollTypeFromData('', undefined, {})

    expect(result).toBe(ROLL_TYPE.DAMAGE)
  })

  test('Tests for melee attack if no chatthing is provided', () => {
    const result = getRollTypeFromData('', {
      isOfType: (type: ActionType) => type === ActionType.MeleeAttack,
    } as unknown as MeleeAttackModel, {})

    expect(result).toBe(ROLL_TYPE.MELEE)
  })

  test('Tests for ranged attack if no chatthing is provided', () => {
    const result = getRollTypeFromData(
      '',
      {
        isOfType: (type: ActionType) => type === ActionType.RangedAttack,
      } as unknown as RangedAttackModel,
      {}
    )

    expect(result).toBe(ROLL_TYPE.RANGED)
  })

   test('Tests for damage action if no chatthing is provided', () => {
     const result = getRollTypeFromData(
       '',
       {
         isOfType: (type: ActionType) => type === ActionType.RangedAttack,
       } as unknown as RangedAttackModel,
       { action: { type: 'damage' } }
     )

     expect(result).toBe(ROLL_TYPE.DAMAGE)
   })

   test('Tests for deriveddamage action if no chatthing is provided', () => {
     const result = getRollTypeFromData(
       '',
       {
         isOfType: (type: ActionType) => type === ActionType.RangedAttack,
       } as unknown as RangedAttackModel,
       { action: { type: 'deriveddamage' } }
     )

     expect(result).toBe(ROLL_TYPE.DAMAGE)
   })
})

vi.stubGlobal('game', {
  i18n: { localize: (key: string) => (key === 'GURPS.modifiers_.moveAndAttackRangedBulk' ? 'for bulk' : '') },
})

describe('taggedModToApply', () => {
  test.for([
    ['[@YNPi9JgE440B2egj@IQ]', ['+4 to IQ rolls #iq']],
    ['[@TKhYpsMQ4KmECA5z@M:" (Swung)"]', ['+1 to hit in melee #melee', '+3 to hit #hit']],
    ['[@TKhYpsMQ4KmECA5z@R:" (Thrown)"]', ['+2 to hit in ranged #ranged', '+3 to hit #hit']],
    ['[@TKhYpsMQ4KmECA5z@D:" (Swung)"]', []],
  ])('selects appropriate modifiers based on roll type', ([chatThing, expected]) => {
    const allMods = ['+1 to hit in melee #melee', '+2 to hit in ranged #ranged', '+3 to hit #hit', '+4 to IQ rolls #iq']

    const result = taggedModToApply(chatThing as string, undefined, { obj: undefined }, defaultSettings, allMods, false)

    expect(result.modsToApply.sort()).toEqual((expected as Array<string>).sort())
  })

  test.for([
    [true, ['+4 to IQ rolls in combat #iq #combat', '+1 to IQ rolls #iq']],
    [false, ['+3 to IQ rolls out of combat #iq #no_combat', '+1 to IQ rolls #iq']],
  ])('selects appropriate modifiers based on roll type', ([inCombat, expected]) => {
    const allMods = [
      '+4 to IQ rolls in combat #iq #combat',
      '+3 to IQ rolls out of combat #iq #no_combat',
      '+1 to IQ rolls #iq',
    ]

    const result = taggedModToApply(
      '[@YNPi9JgE440B2egj@IQ]',
      undefined,
      { obj: undefined },
      defaultSettings,
      allMods,
      inCombat as boolean
    )

    expect(result.modsToApply.sort()).toEqual((expected as Array<string>).sort())
  })

  test.for([
    ['-4', ['-4 for bulk #ranged #maneuver @man:move_and_attack']],
    ['-3', ['-3 for bulk #ranged #maneuver @man:move_and_attack']],
    ['', ['-2 for bulk #ranged #maneuver @man:move_and_attack']],
    ['-1', ['-2 for bulk #ranged #maneuver @man:move_and_attack']],
  ])('adjusts bulk penalty for ranged attack if bulk < -2', ([bulkText, expected]) => {
    const allMods = ['-2 for bulk #ranged #maneuver @man:move_and_attack']

    const result = taggedModToApply(
      '[@TKhYpsMQ4KmECA5z@R:" (Thrown)"]',
      undefined,
      { obj: { bulkText: bulkText } },
      defaultSettings,
      allMods,
      true
    )

    expect(result.modsToApply.sort()).toEqual((expected as Array<string>).sort())
  })

  test('Parry penalty is only applied for parrys from the matching attack', () => {
    const allMods = [
      '-8 To Parry Penalty Katana #parry #maneuver #Swung @Actor.TKhYpsMQ4KmECA5z.Item.7VGrPxDSS5epo5dD.Action.1P8If0c1CNiqZZu5',
      '-8 To Parry Penalty Katana #parry #maneuver #Swung @Actor.TKhYpsMQ4KmECA5z.Item.7VGrPxDSS5epo5dD.Action.SHcLDishtHhB4ogm',
      '-4 To Parry Penalty Shortsword #parry #maneuver #Swung @Actor.TKhYpsMQ4KmECA5z.Item.pZeb5FKgKp4IXkTh.Action.0YpHKdr0uDH6JGgp',
    ]

    const result = taggedModToApply(
      '[@TKhYpsMQ4KmECA5z@P:"Katana (Thrust)"]',
      undefined,
      { obj: { uuid: 'Actor.TKhYpsMQ4KmECA5z.Item.7VGrPxDSS5epo5dD.Action.1P8If0c1CNiqZZu5' } },
      defaultSettings,
      allMods,
      true
    )

    expect(result.modsToApply.sort()).toEqual(
      [
        '-8 To Parry Penalty Katana #parry #maneuver #Swung @Actor.TKhYpsMQ4KmECA5z.Item.7VGrPxDSS5epo5dD.Action.1P8If0c1CNiqZZu5',
      ].sort()
    )
  })

  test('Aim bonus is only applied for attacks from the matching attack', () => {
    const allMods = [
      '+2 To Aim Bonus Large Knife #hit #maneuver @Actor.TKhYpsMQ4KmECA5z.Item.T6jZE3aTfcbGIAb0.Action.Xx6F0fLdynnNhQon',
      '+2 To Aim Bonus Small Knife #hit #maneuver @Actor.TKhYpsMQ4KmECA5z.Item.wcpf8ECgHkRXrrZU.Action.naD36DRPlLu3nipH',
      '+5 To Aim Bonus Longbow #hit #maneuver @Actor.TKhYpsMQ4KmECA5z.Item.cNHH6Dg8ZgutjuJf.Action.KhneGcNd0UkRhP2n',
    ]

    const result = taggedModToApply(
      '[@TKhYpsMQ4KmECA5z@R:"Large Knife (Thrown)"]',
      undefined,
      { obj: { uuid: '@Actor.TKhYpsMQ4KmECA5z.Item.T6jZE3aTfcbGIAb0.Action.Xx6F0fLdynnNhQon' } },
      defaultSettings,
      allMods,
      true
    )

    expect(result.modsToApply.sort()).toEqual(
      [
        '+2 To Aim Bonus Large Knife #hit #maneuver @Actor.TKhYpsMQ4KmECA5z.Item.T6jZE3aTfcbGIAb0.Action.Xx6F0fLdynnNhQon',
      ].sort()
    )
  })
})
