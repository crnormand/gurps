import { RangedAttackModel } from '@module/action/ranged-attack.js'

/* ---------------------------------------- */
/*  Helpers                                 */
/* ---------------------------------------- */

const rangedDefaults = () => ({
  importedLevel: 0,
  otf: '',
  damage: [],
  consumeAction: true,
  extraAttacks: 0,
  itemModifiers: '',
  mode: '',
  modifierTags: [],
  notes: '',
  st: '',
  acc: { base: 0, scope: 0, jet: false },
  ammo: null,
  bulk: { normal: 0, giant: 0, retractingStock: false },
  range: { halfDamage: 0, min: 0, max: 0, musclePowered: false, inMiles: false },
  rateOfFire: {
    mode1: { shotsPerAttack: 0, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
    mode2: { shotsPerAttack: 0, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
    jet: false,
  },
  recoil: { shot: 0, slug: 0 },
  shots: { count: 0, inChamber: 0, duration: 0, reloadTime: 0, reloadTimeIsPerShot: false, thrown: false },
})

const emptyMode = { shotsPerAttack: 0, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false }

const rofWith = (
  mode1: object = {},
  mode2: object = {},
  jet = false
): { mode1: object; mode2: object; jet: boolean } => ({
  mode1: { ...emptyMode, ...mode1 },
  mode2: { ...emptyMode, ...mode2 },
  jet,
})

/** Create a RangedAttackModel with the given overrides. Display-value tests use isOwned=false so
 * #prepareMusclePoweredRange (which needs an actor) is never triggered from prepareBaseData. */
function makeRanged(overrides: object = {}): RangedAttackModel {
  const model = new RangedAttackModel({ ...rangedDefaults(), ...overrides } as any)

  // @ts-expect-error – mock parent chain for tests
  model.parent = { parent: { isOwned: false } }

  return model
}

/* ---------------------------------------- */
/*  RangedAttackModel                       */
/* ---------------------------------------- */

describe('RangedAttackModel', () => {
  /* ---------------------------------------- */
  /*  cleanData                               */
  /* ---------------------------------------- */

  describe('cleanData', () => {
    describe('acc normalization', () => {
      test('resets base and scope to 0 when jet is true', () => {
        const source = { acc: { jet: true, base: 4, scope: 2 } }
        const result = RangedAttackModel.cleanData(source)

        expect(result.acc).toEqual({ jet: true, base: 0, scope: 0 })
      })

      test('leaves base and scope unchanged when jet is false', () => {
        const source = { acc: { jet: false, base: 3, scope: 1 } }
        const result = RangedAttackModel.cleanData(source)

        expect(result.acc).toEqual({ jet: false, base: 3, scope: 1 })
      })

      test.each([
        ['negative base clamped to 0', { jet: false, base: -1, scope: 0 }, { jet: false, base: 0, scope: 0 }],
        ['negative scope clamped to 0', { jet: false, base: 3, scope: -2 }, { jet: false, base: 3, scope: 0 }],
      ])('%s', (_desc, acc, expected) => {
        const result = RangedAttackModel.cleanData({ acc })

        expect(result.acc).toEqual(expected)
      })
    })

    /* ---------------------------------------- */

    describe('bulk normalization', () => {
      test.each([
        ['negative normal left unchanged', { normal: -3, giant: 0 }, -3, 0],
        ['negative giant left unchanged', { normal: 0, giant: -4 }, 0, -4],
        ['zero values left unchanged', { normal: 0, giant: 0 }, 0, 0],
        ['positive normal clamped to 0', { normal: 3, giant: 0 }, 0, 0],
        ['positive giant clamped to 0', { normal: 0, giant: 5 }, 0, 0],
      ])('%s', (_desc, bulk, expectedNormal, expectedGiant) => {
        const result = RangedAttackModel.cleanData({ bulk })

        expect((result.bulk as any).normal).toBe(expectedNormal)
        expect((result.bulk as any).giant).toBe(expectedGiant)
      })
    })

    /* ---------------------------------------- */

    describe('range normalization', () => {
      test.each([
        ['negative values clamped to 0', { halfDamage: -1, min: -5, max: -3 }, { halfDamage: 0, min: 0, max: 0 }],
        ['inverted min/max are swapped', { halfDamage: 0, min: 10, max: 5 }, { halfDamage: 0, min: 5, max: 10 }],
        ['valid range left unchanged', { halfDamage: 50, min: 0, max: 100 }, { halfDamage: 50, min: 0, max: 100 }],
        ['halfDamage below min is cleared', { halfDamage: 3, min: 5, max: 20 }, { halfDamage: 0, min: 5, max: 20 }],
        ['halfDamage above max is cleared', { halfDamage: 30, min: 0, max: 20 }, { halfDamage: 0, min: 0, max: 20 }],
      ])('%s', (_desc, range, expected) => {
        const result = RangedAttackModel.cleanData({ range })

        expect({
          halfDamage: (result.range as any).halfDamage,
          min: (result.range as any).min,
          max: (result.range as any).max,
        }).toEqual(expected)
      })
    })

    /* ---------------------------------------- */

    describe('rateOfFire normalization', () => {
      test('resets mode flags when shotsPerAttack is 0', () => {
        const mode = {
          shotsPerAttack: 0,
          secondaryProjectiles: 5,
          fullAutoOnly: true,
          highCyclicControlledBursts: true,
        }
        const result = RangedAttackModel.cleanData({ rateOfFire: { mode1: mode, mode2: { ...mode }, jet: false } })

        expect((result.rateOfFire as any).mode1).toEqual({
          shotsPerAttack: 0,
          secondaryProjectiles: 0,
          fullAutoOnly: false,
          highCyclicControlledBursts: false,
        })
      })

      test('clamps negative shotsPerAttack to 0 and resets mode flags', () => {
        const mode = {
          shotsPerAttack: -3,
          secondaryProjectiles: 5,
          fullAutoOnly: true,
          highCyclicControlledBursts: false,
        }
        const result = RangedAttackModel.cleanData({ rateOfFire: { mode1: mode, mode2: { ...emptyMode }, jet: false } })

        expect((result.rateOfFire as any).mode1).toEqual({
          shotsPerAttack: 0,
          secondaryProjectiles: 0,
          fullAutoOnly: false,
          highCyclicControlledBursts: false,
        })
      })

      test('rounds fractional shotsPerAttack up via ceil', () => {
        const mode = {
          shotsPerAttack: 0.7,
          secondaryProjectiles: 0,
          fullAutoOnly: false,
          highCyclicControlledBursts: false,
        }
        const result = RangedAttackModel.cleanData({ rateOfFire: { mode1: mode, mode2: { ...emptyMode }, jet: false } })

        expect((result.rateOfFire as any).mode1.shotsPerAttack).toBe(1)
      })

      test('clamps negative secondaryProjectiles to 0', () => {
        const mode = {
          shotsPerAttack: 3,
          secondaryProjectiles: -2,
          fullAutoOnly: false,
          highCyclicControlledBursts: false,
        }
        const result = RangedAttackModel.cleanData({ rateOfFire: { mode1: mode, mode2: { ...emptyMode }, jet: false } })

        expect((result.rateOfFire as any).mode1.secondaryProjectiles).toBe(0)
      })

      test('applies normalization independently to mode1 and mode2', () => {
        const rateOfFire = {
          mode1: { shotsPerAttack: 3, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
          mode2: { shotsPerAttack: 0, secondaryProjectiles: 5, fullAutoOnly: true, highCyclicControlledBursts: false },
          jet: false,
        }
        const result = RangedAttackModel.cleanData({ rateOfFire })

        expect((result.rateOfFire as any).mode1.shotsPerAttack).toBe(3)
        expect((result.rateOfFire as any).mode2.shotsPerAttack).toBe(0)
        expect((result.rateOfFire as any).mode2.secondaryProjectiles).toBe(0)
        expect((result.rateOfFire as any).mode2.fullAutoOnly).toBe(false)
      })
    })

    /* ---------------------------------------- */

    describe('recoil normalization', () => {
      test.each([
        ['negative shot clamped to 0', { shot: -1, slug: 0 }, 0, 0],
        ['negative slug clamped to 0', { shot: 2, slug: -2 }, 2, 0],
        ['positive values left unchanged', { shot: 2, slug: 4 }, 2, 4],
      ])('%s', (_desc, recoil, expectedShot, expectedSlug) => {
        const result = RangedAttackModel.cleanData({ recoil })

        expect((result.recoil as any).shot).toBe(expectedShot)
        expect((result.recoil as any).slug).toBe(expectedSlug)
      })
    })

    /* ---------------------------------------- */

    describe('shots normalization', () => {
      test('thrown weapon clears count, inChamber, and duration', () => {
        const shots = { thrown: true, count: 5, inChamber: 2, duration: 3, reloadTime: 4, reloadTimeIsPerShot: false }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).count).toBe(0)
        expect((result.shots as any).inChamber).toBe(0)
        expect((result.shots as any).duration).toBe(0)
      })

      test('negative count and inChamber clamped to 0', () => {
        const shots = {
          thrown: false,
          count: -3,
          inChamber: -1,
          duration: 0,
          reloadTime: 0,
          reloadTimeIsPerShot: false,
        }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).count).toBe(0)
        expect((result.shots as any).inChamber).toBe(0)
      })

      test('zero count and inChamber clears duration and reloadTime', () => {
        const shots = { thrown: false, count: 0, inChamber: 0, duration: 5, reloadTime: 3, reloadTimeIsPerShot: false }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).duration).toBe(0)
        expect((result.shots as any).reloadTime).toBe(0)
      })

      test('negative duration clamped to 0 when shots exist', () => {
        const shots = { thrown: false, count: 5, inChamber: 0, duration: -2, reloadTime: 0, reloadTimeIsPerShot: false }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).duration).toBe(0)
      })

      test('negative reloadTime clamped to 0', () => {
        const shots = { thrown: false, count: 5, inChamber: 0, duration: 0, reloadTime: -1, reloadTimeIsPerShot: false }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).reloadTime).toBe(0)
      })

      test('valid shots left unchanged', () => {
        const shots = { thrown: false, count: 15, inChamber: 1, duration: 10, reloadTime: 3, reloadTimeIsPerShot: true }
        const result = RangedAttackModel.cleanData({ shots })

        expect((result.shots as any).count).toBe(15)
        expect((result.shots as any).inChamber).toBe(1)
        expect((result.shots as any).duration).toBe(10)
        expect((result.shots as any).reloadTime).toBe(3)
      })
    })
  })

  /* ---------------------------------------- */

  describe('#prepareDisplayValues (via prepareDerivedData)', () => {
    describe('accText', () => {
      test('jet accuracy → localized jet key', () => {
        const model = makeRanged({ acc: { base: 0, scope: 0, jet: true } })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.accText).toBe('GURPS.action.rangedAttack.jet')
      })

      test.each([
        ['base only', { base: 3, scope: 0, jet: false }, '3'],
        ['zero base', { base: 0, scope: 0, jet: false }, '0'],
        ['base + scope', { base: 3, scope: 1, jet: false }, '3+1'],
        ['larger base + scope', { base: 4, scope: 2, jet: false }, '4+2'],
        ['scope is omitted when 0', { base: 5, scope: 0, jet: false }, '5'],
      ])('%s', (_desc, acc, expected) => {
        const model = makeRanged({ acc })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.accText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('bulkText', () => {
      test.each([
        ['zero bulk → empty', { normal: 0, giant: 0, retractingStock: false }, ''],
        ['positive bulk → empty', { normal: 1, giant: 0, retractingStock: false }, ''],
        ['negative normal only', { normal: -2, giant: 0, retractingStock: false }, '-2'],
        ['normal + different giant', { normal: -3, giant: -5, retractingStock: false }, '-3/-5'],
        ['normal + same giant → no slash', { normal: -3, giant: -3, retractingStock: false }, '-3'],
        ['retracting stock appends *', { normal: -3, giant: 0, retractingStock: true }, '-3*'],
        ['normal + giant + stock', { normal: -3, giant: -5, retractingStock: true }, '-3/-5*'],
      ])('%s', (_desc, bulk, expected) => {
        const model = makeRanged({ bulk })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.bulkText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('rangeText', () => {
      test.each([
        ['no range', { halfDamage: 0, min: 0, max: 0, musclePowered: false, inMiles: false }, ''],
        ['max only', { halfDamage: 0, min: 0, max: 100, musclePowered: false, inMiles: false }, '100'],
        ['half-damage + max', { halfDamage: 150, min: 0, max: 500, musclePowered: false, inMiles: false }, '150/500'],
        ['min + max', { halfDamage: 0, min: 10, max: 50, musclePowered: false, inMiles: false }, '10-50'],
        ['in miles', { halfDamage: 0, min: 0, max: 100, musclePowered: false, inMiles: true }, '100mi'],
        [
          'muscle-powered (unresolved) adds x prefix',
          { halfDamage: 5, min: 0, max: 20, musclePowered: true, inMiles: false },
          'x5/x20',
        ],
      ])('%s', (_desc, range, expected) => {
        const model = makeRanged({ range })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rangeText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('rofText', () => {
      test('jet → localized jet key', () => {
        const model = makeRanged({ rateOfFire: rofWith({}, {}, true) })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rofText).toBe('GURPS.action.rangedAttack.jet')
      })

      test('no shots in either mode → empty', () => {
        const model = makeRanged({ rateOfFire: rofWith() })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rofText).toBe('')
      })

      test.each([
        ['single mode shots', { shotsPerAttack: 3 }, '3'],
        ['full-auto only', { shotsPerAttack: 10, fullAutoOnly: true }, '10!'],
        ['high-cyclic bursts', { shotsPerAttack: 10, highCyclicControlledBursts: true }, '10#'],
        [
          'full-auto + high-cyclic',
          { shotsPerAttack: 10, fullAutoOnly: true, highCyclicControlledBursts: true },
          '10!#',
        ],
        ['secondary projectiles', { shotsPerAttack: 3, secondaryProjectiles: 9 }, '3x9'],
      ])('%s', (_desc, mode1Overrides, expected) => {
        const model = makeRanged({ rateOfFire: rofWith(mode1Overrides) })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rofText).toBe(expected)
      })

      test('dual mode → mode1/mode2', () => {
        const model = makeRanged({ rateOfFire: rofWith({ shotsPerAttack: 3 }, { shotsPerAttack: 20 }) })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rofText).toBe('3/20')
      })

      test('mode1 empty + mode2 has shots → only mode2 shown', () => {
        const model = makeRanged({ rateOfFire: rofWith({}, { shotsPerAttack: 20 }) })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.rofText).toBe('20')
      })
    })

    /* ---------------------------------------- */

    describe('recoilText', () => {
      test.each([
        ['no recoil → empty', { shot: 0, slug: 0 }, ''],
        ['shot only', { shot: 2, slug: 0 }, '2'],
        ['shot + slug', { shot: 2, slug: 4 }, '2/4'],
      ])('%s', (_desc, recoil, expected) => {
        const model = makeRanged({ recoil })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.recoilText).toBe(expected)
      })
    })

    /* ---------------------------------------- */

    describe('shotsText', () => {
      test('thrown weapon → T', () => {
        const model = makeRanged({
          shots: { count: 0, inChamber: 0, duration: 0, reloadTime: 0, reloadTimeIsPerShot: false, thrown: true },
        })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.shotsText).toBe('T')
      })

      test.each([
        ['no shots → empty', { count: 0, inChamber: 0 }, ''],
        ['shot count only', { count: 15 }, '15'],
        ['count + chamber', { count: 15, inChamber: 1 }, '15+1'],
        ['count + duration', { count: 30, duration: 10 }, '30x10s'],
        ['count + reload time', { count: 15, reloadTime: 4 }, '15(4)'],
        ['count + per-shot reload', { count: 15, reloadTime: 3, reloadTimeIsPerShot: true }, '15(3i)'],
        ['count + chamber + reload', { count: 15, inChamber: 1, reloadTime: 4 }, '15+1(4)'],
        ['empty shots + reload only', { count: 0, inChamber: 0, reloadTime: 4 }, '(4)'],
      ])('%s', (_desc, shotsOverrides, expected) => {
        const shotsDefaults = {
          count: 0,
          inChamber: 0,
          duration: 0,
          reloadTime: 0,
          reloadTimeIsPerShot: false,
          thrown: false,
        }
        const model = makeRanged({ shots: { ...shotsDefaults, ...shotsOverrides } })

        model.prepareDerivedData()
        model.prepareSiblingData()

        expect(model.shotsText).toBe(expected)
      })
    })
  })
})
