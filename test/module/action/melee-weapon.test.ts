import { MeleeAttackModel } from '@module/action/melee-attack.js'

/* ---------------------------------------- */
/*  Helpers                                 */
/* ---------------------------------------- */

const meleeDefaults = () => ({
  import: 0,
  otf: '',
  damage: [],
  consumeAction: true,
  extraAttacks: 0,
  itemModifiers: '',
  mode: '',
  modifierTags: '',
  notes: '',
  st: '',
  reach: { closeCombat: false, min: 0, max: 0, changeRequiresReady: false },
  parry: { canParry: false, fencing: false, unbalanced: false, modifier: 0 },
  baseParryPenalty: 0,
  block: { canBlock: false, modifier: 0 },
})

/** Create a MeleeAttackModel with the given overrides. Pass isOwned=true to simulate an owned item,
 * which enables #prepareDefenses and #prepareLevelsFromOtf. */
function makeMelee(overrides: object = {}, isOwned = false): MeleeAttackModel {
  const model = new MeleeAttackModel({ ...meleeDefaults(), ...overrides } as any)

  // @ts-expect-error – mock parent chain for tests
  model.parent = { parent: { isOwned } }

  return model
}

/* ---------------------------------------- */
/*  MeleeAttackModel                        */
/* ---------------------------------------- */

describe('MeleeAttackModel', () => {
  /* ---------------------------------------- */
  /*  cleanData                               */
  /* ---------------------------------------- */

  describe('cleanData', () => {
    describe('parry normalization', () => {
      test('resets fencing, unbalanced, and modifier when canParry is false', () => {
        const source = { parry: { canParry: false, fencing: true, unbalanced: true, modifier: 2 } }
        const result = MeleeAttackModel.cleanData(source)

        expect(result.parry).toEqual({ canParry: false, fencing: false, unbalanced: false, modifier: 0 })
      })

      test('leaves parry flags and modifier unchanged when canParry is true', () => {
        const source = { parry: { canParry: true, fencing: true, unbalanced: true, modifier: 2 } }
        const result = MeleeAttackModel.cleanData(source)

        expect(result.parry).toEqual({ canParry: true, fencing: true, unbalanced: true, modifier: 2 })
      })

      test('ignores source without a parry field', () => {
        const source = { reach: { min: 1, max: 2 } }

        expect(() => MeleeAttackModel.cleanData(source)).not.toThrow()
      })
    })

    /* ---------------------------------------- */

    describe('block normalization', () => {
      test('resets modifier when canBlock is false', () => {
        const source = { block: { canBlock: false, modifier: 2 } }
        const result = MeleeAttackModel.cleanData(source)

        expect(result.block).toEqual({ canBlock: false, modifier: 0 })
      })

      test('leaves modifier unchanged when canBlock is true', () => {
        const source = { block: { canBlock: true, modifier: 2 } }
        const result = MeleeAttackModel.cleanData(source)

        expect(result.block).toEqual({ canBlock: true, modifier: 2 })
      })

      test('ignores source without a block field', () => {
        const source = { parry: { canParry: true, modifier: 0 } }

        expect(() => MeleeAttackModel.cleanData(source)).not.toThrow()
      })
    })

    /* ---------------------------------------- */

    describe('reach normalization', () => {
      test.each([
        ['negative values clamped to 0', { min: -1, max: -2 }, 0, 0],
        ['negative min + positive max → min clamped then raised to 1', { min: -1, max: 3 }, 1, 3],
        ['zero min with non-zero max → min raised to 1', { min: 0, max: 3 }, 1, 3],
        ['non-zero min with zero max → max set to min', { min: 2, max: 0 }, 2, 2],
        ['inverted range → max raised to min', { min: 3, max: 1 }, 3, 3],
        ['valid range left unchanged', { min: 1, max: 3 }, 1, 3],
        ['both zero left unchanged', { min: 0, max: 0 }, 0, 0],
      ])('%s', (_desc, input, expectedMin, expectedMax) => {
        const result = MeleeAttackModel.cleanData({ reach: input })

        expect((result.reach as any).min).toBe(expectedMin)
        expect((result.reach as any).max).toBe(expectedMax)
      })
    })
  })

  /* ---------------------------------------- */
  /*  #prepareDisplayValues                   */
  /* ---------------------------------------- */

  describe('#prepareDisplayValues (via prepareDerivedData)', () => {
    describe('parryText', () => {
      test('localized disabled key when canParry is false', () => {
        const model = makeMelee({ parry: { canParry: false, fencing: false, unbalanced: false, modifier: 0 } })

        model.prepareDerivedData()

        expect(model.parryText).toBe('GURPS.action.meleeAttack.parryDisabled')
      })

      // parryLevel = floor(level / 2) + 3 + modifier
      test.each([
        ['basic parry level', 10, 0, false, false, '8'], // floor(10/2)+3 = 8
        ['fencing suffix', 10, 0, true, false, '8F'],
        ['unbalanced suffix', 10, 0, false, true, '8U'],
        ['fencing + unbalanced suffixes', 10, 0, true, true, '8FU'],
        ['positive modifier', 10, 2, false, false, '10'], // floor(10/2)+3+2 = 10
        ['negative modifier', 10, -1, false, false, '7'], // floor(10/2)+3-1 = 7
        ['odd level rounds down', 11, 0, false, false, '8'], // floor(11/2)+3 = 8
      ])('%s', (_desc, importLevel, modifier, fencing, unbalanced, expected) => {
        const model = makeMelee(
          {
            import: importLevel,
            parry: { canParry: true, fencing, unbalanced, modifier },
            block: { canBlock: false, modifier: 0 },
          },
          true // isOwned so #prepareDefenses runs
        )

        model.prepareDerivedData()

        expect(model.parryText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('blockText', () => {
      test('localized disabled key when canBlock is false', () => {
        const model = makeMelee({ block: { canBlock: false, modifier: 0 } })

        model.prepareDerivedData()

        expect(model.blockText).toBe('GURPS.action.meleeAttack.blockDisabled')
      })

      // blockLevel = floor(level / 2) + 3 + modifier
      test.each([
        ['basic block level', 10, 0, '8'], // floor(10/2)+3 = 8
        ['positive modifier', 10, 2, '10'],
        ['negative modifier', 10, -1, '7'],
      ])('%s', (_desc, importLevel, modifier, expected) => {
        const model = makeMelee(
          {
            import: importLevel,
            parry: { canParry: false, fencing: false, unbalanced: false, modifier: 0 },
            block: { canBlock: true, modifier },
          },
          true
        )

        model.prepareDerivedData()

        expect(model.blockText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('reachText', () => {
      test.each([
        ['no reach', { closeCombat: false, min: 0, max: 0, changeRequiresReady: false }, ''],
        ['close combat only', { closeCombat: true, min: 0, max: 0, changeRequiresReady: false }, 'C'],
        ['single reach', { closeCombat: false, min: 1, max: 1, changeRequiresReady: false }, '1'],
        ['reach range', { closeCombat: false, min: 1, max: 2, changeRequiresReady: false }, '1-2'],
        ['close combat + ranged reach', { closeCombat: true, min: 1, max: 2, changeRequiresReady: false }, 'C,1-2'],
        ['close combat + max only', { closeCombat: true, min: 0, max: 1, changeRequiresReady: false }, 'C,0-1'],
        ['ready required', { closeCombat: false, min: 1, max: 1, changeRequiresReady: true }, '1*'],
        ['C + ready required', { closeCombat: true, min: 0, max: 0, changeRequiresReady: true }, 'C*'],
        ['range + ready required', { closeCombat: true, min: 1, max: 2, changeRequiresReady: true }, 'C,1-2*'],
      ])('%s', (_desc, reach, expected) => {
        const model = makeMelee({ reach })

        model.prepareDerivedData()

        expect(model.reachText).toBe(expected)
      })
    })
  })
})
