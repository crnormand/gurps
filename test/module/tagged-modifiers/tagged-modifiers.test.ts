import { MeleeAttackModel, RangedAttackModel } from '@module/action/index.js'
import { ActionType } from '@module/action/types.js'
import { ItemType } from '@module/item/types.js'
import { OtfActionType, OtfRollAction } from '@module/otf/types.js'
import {
  getTagsForRoll,
  getRollTypeFromAction,
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
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE)

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
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE)

    expect(result).toHaveLength(2)
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test('finds the appropriate tag for taste/smell rolls', () => {
    const result = getTagsForRoll(defaultSettings, ROLL_TYPE.TASTE_SMELL)

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
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE)

    expect(result).toHaveLength(3)
    expect(result).toContain('defense')
    expect(result).toContain(expected)
    expect(result).toContain('all')
  })

  test.for([
    [ROLL_TYPE.RANGED, 'ranged'],
    [ROLL_TYPE.MELEE, 'melee'],
  ])('finds the appropriate tag for %s rolls', ([rollType, expected]) => {
    const result = getTagsForRoll(defaultSettings, rollType as ROLL_TYPE)

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
    const result = getTagsForRoll(defaultSettings, ROLL_TYPE.IQ, item as Item.Implementation)

    expect(result).toContain('itemTag1')
    expect(result).toContain('itemTag2')
  })

  test('adds spell college from the provided item', () => {
    const item = {
      system: {
        college: new Set(['college1', 'college2']),
      },
      isOfType: (x: ItemType) => x === ItemType.Spell,
    }
    const result = getTagsForRoll(
      { ...defaultSettings, useSpellCollegeAsTag: true },
      ROLL_TYPE.SPELL,
      item as unknown as Item.Implementation
    )

    expect(result).toContain('college1')
    expect(result).toContain('college2')
  })

  test('adds spell college from the provided item only for spells', () => {
    const item = {
      system: {
        college: new Set(['college1', 'college2']),
      },
      isOfType: (x: ItemType) => x === ItemType.Spell,
    }
    const result = getTagsForRoll(
      { ...defaultSettings, useSpellCollegeAsTag: true },
      ROLL_TYPE.SKILL,
      item as unknown as Item.Implementation
    )

    expect(result).not.toContain('college1')
    expect(result).not.toContain('college2')
  })
})

describe('getRollTypeFromAction', () => {
  test.for([
    [{ type: OtfActionType.weaponParry, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.PARRY],
    [{ type: OtfActionType.weaponBlock, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.BLOCK],
    [{ type: OtfActionType.damage, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.DAMAGE],
    [{ type: OtfActionType.derivedDamage, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.DAMAGE],
    [{ type: OtfActionType.roll, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.UNKNOWN],
    [{ type: OtfActionType.derivedRoll, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.UNKNOWN],
    [{ type: OtfActionType.controlRoll, accumulate: false, formula: '3d' }, undefined, ROLL_TYPE.CR],
    [{ type: OtfActionType.attack, accumulate: false, formula: '3d', isMelee: true }, {isOfType: (x: ActionType) => x === ActionType.MeleeAttack}, ROLL_TYPE.MELEE],
    [{ type: OtfActionType.attack, accumulate: false, formula: '3d', isMelee: false }, {isOfType: (x: ActionType) => x === ActionType.RangedAttack}, ROLL_TYPE.RANGED],
    [{ type: OtfActionType.skillSpell, accumulate: false, formula: '3d', isSkillOnly: false , isSpellOnly: true }, undefined, ROLL_TYPE.SPELL],
    [{ type: OtfActionType.skillSpell, accumulate: false, formula: '3d', isSkillOnly: true, isSpellOnly: false }, undefined, ROLL_TYPE.SKILL],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'ST', attrkey: 'ST' }, undefined, ROLL_TYPE.ST],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'st', attrkey: 'ST' }, undefined, ROLL_TYPE.ST],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'St', attrkey: 'ST' }, undefined, ROLL_TYPE.ST],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'DX', attrkey: 'DX' }, undefined, ROLL_TYPE.DX],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'IQ', attrkey: 'IQ' }, undefined, ROLL_TYPE.IQ],
    [{ type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'HT', attrkey: 'HT' }, undefined, ROLL_TYPE.HT],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'WILL', attrkey: 'WILL' },
      undefined,
      ROLL_TYPE.WILL,
    ],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'PER', attrkey: 'PER' },
      undefined,
      ROLL_TYPE.PER,
    ],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'Dodge', attrkey: 'DODGE' },
      undefined,
      ROLL_TYPE.DODGE,
    ],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'Vision', attrkey: 'VISION' },
      undefined,
      ROLL_TYPE.VISION,
    ],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'Hearing', attrkey: 'HEARING' },
      undefined,
      ROLL_TYPE.HEARING,
    ],
    [
      { type: OtfActionType.attribute, accumulate: false, formula: '3d', attribute: 'Touch', attrkey: 'TOUCH' },
      undefined,
      ROLL_TYPE.TOUCH,
    ],
    [
      {
        type: OtfActionType.attribute,
        accumulate: false,
        formula: '3d',
        attribute: 'Taste Smell',
        attrkey: 'TASTE SMELL',
      },
      undefined,
      ROLL_TYPE.TASTE_SMELL,
    ],
    [
      {
        type: OtfActionType.attribute,
        accumulate: false,
        formula: '3d',
        attribute: 'tastesmell',
        attrkey: 'TASTESMELL',
      },
      undefined,
      ROLL_TYPE.TASTE_SMELL,
    ],
    [
      {
        type: OtfActionType.attribute,
        accumulate: false,
        formula: '3d',
        attribute: 'Fright Check',
        attrkey: 'FRIGHT CHECK',
      },
      undefined,
      ROLL_TYPE.FRIGHT_CHECK,
    ],
    [
      {
        type: OtfActionType.attribute,
        accumulate: false,
        formula: '3d',
        attribute: 'frightcheck',
        attrkey: 'FRIGHTCHECK', 
      },
      undefined,
      ROLL_TYPE.FRIGHT_CHECK,
    ],
  ])('Extracts Roll Type from Otf Action', ([action, attack, expected]) => {
    const result = getRollTypeFromAction(action as unknown as OtfRollAction, attack as unknown as MeleeAttackModel | RangedAttackModel | undefined)

    expect(result).toBe(expected)
  })
})

vi.stubGlobal('game', {
  i18n: { localize: (key: string) => (key === 'GURPS.modifiers_.moveAndAttackRangedBulk' ? 'for bulk' : '') },
})

describe('taggedModToApply', () => {
  test.for([
    [{ type: OtfActionType.attribute, attribute: 'IQ', attrkey: 'IQ' }, undefined, ['+4 to IQ rolls #iq']],
    [{ type: OtfActionType.attack, isMelee: true }, { isOfType: (x: ActionType) => x === ActionType.MeleeAttack }, ['+1 to hit in melee #melee', '+3 to hit #hit']],
    [{ type: OtfActionType.attack, isMelee: false }, { isOfType: (x: ActionType) => x === ActionType.RangedAttack }, ['+2 to hit in ranged #ranged', '+3 to hit #hit']],
    [{ type: OtfActionType.damage }, undefined, []],
  ])('selects appropriate modifiers based on roll type', ([action, attack, expected]) => {
    const allMods = ['+1 to hit in melee #melee', '+2 to hit in ranged #ranged', '+3 to hit #hit', '+4 to IQ rolls #iq']

    const result = taggedModToApply(
      action as unknown as OtfRollAction,
      undefined,
      attack as unknown as MeleeAttackModel | RangedAttackModel | undefined,
      defaultSettings,
      allMods,
      false
    )

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
      { type: OtfActionType.attribute, attribute: 'IQ', attrkey: 'IQ' } as unknown as OtfRollAction,
      undefined,
      undefined,
      defaultSettings,
      allMods,
      inCombat as boolean
    )

    expect(result.modsToApply.sort()).toEqual((expected as Array<string>).sort())
  })

  test.for([
    [-4, ['-4 for bulk #ranged #maneuver @man:move_and_attack']],
    [-3, ['-3 for bulk #ranged #maneuver @man:move_and_attack']],
    [0, ['-2 for bulk #ranged #maneuver @man:move_and_attack']],
    [-1, ['-2 for bulk #ranged #maneuver @man:move_and_attack']],
  ])('adjusts bulk penalty for ranged attack if bulk < -2', ([bulk, expected]) => {
    const allMods = ['-2 for bulk #ranged #maneuver @man:move_and_attack']

    const result = taggedModToApply(
      { type: OtfActionType.attack, isMelee: false } as unknown as OtfRollAction,
      undefined,
      {
        bulk: { normal: bulk },
        isOfType: (x: ActionType) => x === ActionType.RangedAttack,
      } as unknown as RangedAttackModel,
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
      { type: OtfActionType.weaponParry, isMelee: true } as unknown as OtfRollAction,
      undefined,
      { uuid: 'Actor.TKhYpsMQ4KmECA5z.Item.7VGrPxDSS5epo5dD.Action.1P8If0c1CNiqZZu5', isOfType: (x: ActionType) => x === ActionType.MeleeAttack } as unknown as MeleeAttackModel,
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
      { type: OtfActionType.attack, isMelee: false } as unknown as OtfRollAction,
      undefined,
      { uuid: '@Actor.TKhYpsMQ4KmECA5z.Item.T6jZE3aTfcbGIAb0.Action.Xx6F0fLdynnNhQon', isOfType: (x: ActionType) => x === ActionType.RangedAttack } as unknown as RangedAttackModel,
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
