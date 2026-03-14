import {
  parseAcc,
  parseBlock,
  parseBulk,
  parseParry,
  parseRange,
  parseRateOfFire,
  parseReach,
  parseRecoil,
  parseShots,
} from '@module/action/parse-weapon.js'

// game.i18n.localize returns the key unchanged in the test environment,
// so negativeStrings uses the raw key as the localized fallback.

describe('parseParry', () => {
  test.each([
    ['', false, false, false, 0],
    ['-', false, false, false, 0],
    ['–', false, false, false, 0],
    ['—', false, false, false, 0],
    ['no', false, false, false, 0],
    ['No', false, false, false, 0], // trimmed + lowercased before check
    ['  no  ', false, false, false, 0],
  ])('"%s" → cannot parry', (text, canParry, fencing, unbalanced, modifier) => {
    expect(parseParry(text)).toEqual({ canParry, fencing, unbalanced, modifier })
  })

  test.each([
    ['0', true, false, false, 0],
    ['+2', true, false, false, 2],
    ['-1', true, false, false, -1],
    ['0F', true, true, false, 0],
    ['0U', true, false, true, 0],
    ['+2F', true, true, false, 2],
    ['-1U', true, false, true, -1],
    ['+2FU', true, true, true, 2],
  ])('"%s" → canParry with expected fields', (text, canParry, fencing, unbalanced, modifier) => {
    expect(parseParry(text)).toEqual({ canParry, fencing, unbalanced, modifier })
  })
})

/* ---------------------------------------- */

describe('parseBlock', () => {
  test.each([
    ['', false, 0],
    ['-', false, 0],
    ['–', false, 0],
    ['—', false, 0],
    ['no', false, 0],
  ])('"%s" → cannot block', (text, canBlock, modifier) => {
    expect(parseBlock(text)).toEqual({ canBlock, modifier })
  })

  test.each([
    ['0', true, 0],
    ['+2', true, 2],
    ['-1', true, -1],
    ['3', true, 3],
  ])('"%s" → canBlock with modifier', (text, canBlock, modifier) => {
    expect(parseBlock(text)).toEqual({ canBlock, modifier })
  })
})

/* ---------------------------------------- */

describe('parseReach', () => {
  const defaults = { closeCombat: false, min: 0, max: 0, changeRequiresReady: false }

  test('empty string → all defaults', () => {
    expect(parseReach('')).toEqual(defaults)
  })

  test('whitespace only → all defaults', () => {
    expect(parseReach('   ')).toEqual(defaults)
  })

  test.each([
    ['spec', { ...defaults }],
    ['Special', { ...defaults }],
  ])('"%s" → special reach, all defaults', (text, expected) => {
    expect(parseReach(text)).toEqual(expected)
  })

  test.each([
    ['C', { closeCombat: true, min: 0, max: 0, changeRequiresReady: false }],
    ['1', { closeCombat: false, min: 1, max: 0, changeRequiresReady: false }],
    ['2', { closeCombat: false, min: 2, max: 0, changeRequiresReady: false }],
    ['1,2', { closeCombat: false, min: 1, max: 2, changeRequiresReady: false }],
    ['C,1', { closeCombat: true, min: 0, max: 1, changeRequiresReady: false }],
    ['C,1,2', { closeCombat: true, min: 0, max: 2, changeRequiresReady: false }],
    ['1*', { closeCombat: false, min: 1, max: 0, changeRequiresReady: true }],
    ['1,2*', { closeCombat: false, min: 1, max: 2, changeRequiresReady: true }],
    ['C,1,2*', { closeCombat: true, min: 0, max: 2, changeRequiresReady: true }],
  ])('"%s" → %j', (text, expected) => {
    expect(parseReach(text)).toEqual(expected)
  })

  test('ignores whitespace inside reach string', () => {
    expect(parseReach(' 1, 2 ')).toEqual({ closeCombat: false, min: 1, max: 2, changeRequiresReady: false })
  })
})

/* ---------------------------------------- */

describe('parseAcc', () => {
  test.each([
    ['jet', { base: 0, scope: 0, jet: true }],
    ['Jet', { base: 0, scope: 0, jet: true }],
    ['JET', { base: 0, scope: 0, jet: true }],
  ])('"%s" → jet accuracy', (text, expected) => {
    expect(parseAcc(text)).toEqual(expected)
  })

  test.each([
    ['3', { base: 3, scope: 0, jet: false }],
    ['+3', { base: 3, scope: 0, jet: false }],
    ['0', { base: 0, scope: 0, jet: false }],
    ['3+1', { base: 3, scope: 1, jet: false }],
    ['4+2', { base: 4, scope: 2, jet: false }],
  ])('"%s" → base/scope accuracy', (text, expected) => {
    expect(parseAcc(text)).toEqual(expected)
  })
})

/* ---------------------------------------- */

describe('parseBulk', () => {
  test.each([
    ['-2', { normal: -2, giant: 0, retractingStock: false }],
    ['-3', { normal: -3, giant: 0, retractingStock: false }],
    ['0', { normal: 0, giant: 0, retractingStock: false }],
    ['-3/-5', { normal: -3, giant: -5, retractingStock: false }],
    ['-3*', { normal: -3, giant: 0, retractingStock: true }],
    ['-3/-5*', { normal: -3, giant: -5, retractingStock: true }],
    [' -4 / -6 ', { normal: -4, giant: -6, retractingStock: false }],
  ])('"%s" → %j', (text, expected) => {
    expect(parseBulk(text)).toEqual(expected)
  })
})

/* ---------------------------------------- */

describe('parseRange', () => {
  const defaults = { halfDamage: 0, min: 0, max: 0, musclePowered: false, inMiles: false }

  test.each([
    ['sight', defaults],
    ['spec', defaults],
    ['Skill', defaults],
    ['Point Blank', defaults],
    ['PBAOE', defaults],
    ['B15', defaults], // starts with 'b'
  ])('"%s" → special range, returns defaults', (text, expected) => {
    expect(parseRange(text)).toEqual(expected)
  })

  test.each([
    ['100', { ...defaults, max: 100 }],
    ['500', { ...defaults, max: 500 }],
    ['150/500', { ...defaults, halfDamage: 150, max: 500 }],
    ['50/100', { ...defaults, halfDamage: 50, max: 100 }],
    ['10-50', { ...defaults, min: 10, max: 50 }],
    ['100mi', { ...defaults, max: 100, inMiles: true }],
    ['50/100mi', { ...defaults, halfDamage: 50, max: 100, inMiles: true }],
  ])('"%s" → %j', (text, expected) => {
    expect(parseRange(text)).toEqual(expected)
  })

  test.each([
    ['x5/x20', { ...defaults, halfDamage: 5, max: 20, musclePowered: true }],
    ['xST', { ...defaults, musclePowered: true }],
  ])('"%s" → muscle-powered range', (text, expected) => {
    expect(parseRange(text)).toEqual(expected)
  })

  test('handles 1/2D format', () => {
    expect(parseRange('1/2D 150/500')).toEqual({ ...defaults, halfDamage: 150, max: 500 })
  })
})

/* ---------------------------------------- */

describe('parseRecoil', () => {
  test.each([
    ['2', { shot: 2, slug: 0 }],
    ['1', { shot: 1, slug: 0 }],
    ['3', { shot: 3, slug: 0 }],
    ['2/4', { shot: 2, slug: 4 }],
    ['1/3', { shot: 1, slug: 3 }],
    [' 2 / 4 ', { shot: 2, slug: 4 }],
  ])('"%s" → %j', (text, expected) => {
    expect(parseRecoil(text)).toEqual(expected)
  })
})

/* ---------------------------------------- */

describe('parseShots', () => {
  const defaults = { count: 0, inChamber: 0, duration: 0, reloadTime: 0, reloadTimeIsPerShot: false, thrown: false }

  test.each([
    ['FP', { ...defaults }],
    ['10fp', { ...defaults }],
    ['2hrs', { ...defaults }],
    ['1day', { ...defaults }],
  ])('"%s" → unsupported shot type, returns defaults', (text, expected) => {
    expect(parseShots(text)).toEqual(expected)
  })

  test.each([
    ['spec', { ...defaults }],
    ['Spec', { ...defaults }],
  ])('"%s" → special shots, returns defaults', (text, expected) => {
    expect(parseShots(text)).toEqual(expected)
  })

  test('T → thrown weapon', () => {
    expect(parseShots('T')).toEqual({ ...defaults, thrown: true })
  })

  test.each([
    ['15', { ...defaults, count: 15 }],
    ['30', { ...defaults, count: 30 }],
    ['1', { ...defaults, count: 1 }],
  ])('"%s" → shot count only', (text, expected) => {
    expect(parseShots(text)).toEqual(expected)
  })

  test('15+1 → count with in-chamber round', () => {
    expect(parseShots('15+1')).toEqual({ ...defaults, count: 15, inChamber: 1 })
  })

  test('15(4) → count with reload time', () => {
    expect(parseShots('15(4)')).toEqual({ ...defaults, count: 15, reloadTime: 4 })
  })

  test('15(3i) → count with per-shot reload time', () => {
    expect(parseShots('15(3i)')).toEqual({ ...defaults, count: 15, reloadTime: 3, reloadTimeIsPerShot: true })
  })

  test('15+1(4) → count, in-chamber, and reload time', () => {
    expect(parseShots('15+1(4)')).toEqual({ ...defaults, count: 15, inChamber: 1, reloadTime: 4 })
  })

  test('30x10(3i) → count, duration, and per-shot reload time', () => {
    expect(parseShots('30x10(3i)')).toEqual({
      ...defaults,
      count: 30,
      duration: 10,
      reloadTime: 3,
      reloadTimeIsPerShot: true,
    })
  })
})

/* ---------------------------------------- */

describe('parseRateOfFire', () => {
  const emptyMode = {
    shotsPerAttack: 0,
    secondaryProjectiles: 0,
    fullAutoOnly: false,
    highCyclicControlledBursts: false,
  }

  test.each([
    ['jet', true],
    ['Jet', true],
    ['JET', true],
  ])('"%s" → jet RoF', (text, jet) => {
    expect(parseRateOfFire(text)).toEqual({ mode1: emptyMode, mode2: emptyMode, jet })
  })

  test.each([
    ['3', { shotsPerAttack: 3, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false }],
    ['10', { shotsPerAttack: 10, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false }],
    ['10!', { shotsPerAttack: 10, secondaryProjectiles: 0, fullAutoOnly: true, highCyclicControlledBursts: false }],
    ['10#', { shotsPerAttack: 10, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: true }],
    ['3x9', { shotsPerAttack: 3, secondaryProjectiles: 9, fullAutoOnly: false, highCyclicControlledBursts: false }],
    ['x9', { shotsPerAttack: 1, secondaryProjectiles: 9, fullAutoOnly: false, highCyclicControlledBursts: false }],
    ['10!#', { shotsPerAttack: 10, secondaryProjectiles: 0, fullAutoOnly: true, highCyclicControlledBursts: true }],
  ])('single mode "%s" → mode1 with correct fields', (text, mode1) => {
    expect(parseRateOfFire(text)).toEqual({ mode1, mode2: emptyMode, jet: false })
  })

  test('dual-mode "3/20" → mode1 and mode2', () => {
    expect(parseRateOfFire('3/20')).toEqual({
      mode1: { shotsPerAttack: 3, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
      mode2: { shotsPerAttack: 20, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
      jet: false,
    })
  })

  test('dual-mode with secondary projectiles "3x9/20"', () => {
    expect(parseRateOfFire('3x9/20')).toEqual({
      mode1: { shotsPerAttack: 3, secondaryProjectiles: 9, fullAutoOnly: false, highCyclicControlledBursts: false },
      mode2: { shotsPerAttack: 20, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
      jet: false,
    })
  })
})
