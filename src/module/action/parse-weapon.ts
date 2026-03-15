import { fields } from '@gurps-types/foundry/index.js'
import {
  WeaponAccSchema,
  WeaponBlockSchema,
  WeaponBulkSchema,
  WeaponParrySchema,
  WeaponRangeSchema,
  WeaponRateOfFireModeSchema,
  WeaponRateOfFireSchema,
  WeaponReachSchema,
  WeaponRecoilSchema,
  WeaponShotsSchema,
} from '@module/action/fields.js'

type Reach = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponReachSchema>>
type Parry = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponParrySchema>>
type Block = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponBlockSchema>>

type Acc = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponAccSchema>>
type Bulk = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponBulkSchema>>
type Range = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponRangeSchema>>
type Recoil = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponRecoilSchema>>
type Shots = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponShotsSchema>>
type RateOfFire = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponRateOfFireSchema>>
type RateOfFireMode = NonNullable<fields.SchemaField.Internal.InitializedType<WeaponRateOfFireModeSchema>>

/**
 * Helper functions for the actions module.
 * This file includes parsers for getting action values
 * from strings
 */

const numberRegex = /[-+]?\d+/

function extractNumber(text: string): number {
  return text.match(numberRegex)?.[0] ? parseInt(text.match(numberRegex)?.[0] as string) : 0
}

/* ---------------------------------------- */

function negativeStrings(key: string): string[] {
  return ['', '-', '–', '—', 'no', key.toLocaleLowerCase(), game.i18n?.localize(key).toLowerCase() ?? '']
}

/* ---------------------------------------- */

function parseParry(text: string): Parry {
  const parry: Parry = { canParry: false, fencing: false, unbalanced: false, modifier: 0 }

  text = text.trim().toLowerCase()

  if (!negativeStrings('GURPS.action.meleeAttack.parryDisabled').includes(text)) {
    parry.canParry = true
    parry.fencing = text.includes('f')
    parry.unbalanced = text.includes('u')
    parry.modifier = extractNumber(text)
  }

  return parry
}

/* ---------------------------------------- */

function parseBlock(text: string): Block {
  const block: Block = { canBlock: false, modifier: 0 }

  text = text.trim().toLowerCase()

  if (!negativeStrings('GURPS.action.meleeAttack.blockDisabled').includes(text)) {
    block.canBlock = true
    block.modifier = extractNumber(text)
  }

  return block
}

/* ---------------------------------------- */

function parseReach(text: string): Reach {
  const reach: Reach = { closeCombat: false, min: 0, max: 0, changeRequiresReady: false }

  text = text.trim().toLowerCase().replaceAll(' ', '')

  if (text !== '') {
    // Short for "special"
    if (!text.includes('spec')) {
      text = text.replace(/-/g, ',')
      reach.closeCombat = text.includes('c')
      reach.changeRequiresReady = text.includes('*')
      text = text.replaceAll(/[*]/g, '')
      const parts = text.split(',')

      reach.min = extractNumber(parts[0])

      if (parts.length > 1) {
        for (const part of parts.slice(1)) {
          const maxReach = extractNumber(part)

          if (maxReach > (reach.max || 0)) reach.max = maxReach
        }
      }
    }
  }

  return reach
}

/* ---------------------------------------- */

function parseAcc(text: string): Acc {
  const accuracy: Acc = { base: 0, scope: 0, jet: false }

  text = text.trim().toLowerCase().replaceAll(' ', '')

  if (
    text.includes('jet') ||
    text.includes('GURPS.action.rangedAttack.jet'.toLocaleLowerCase()) ||
    text.includes(game.i18n?.localize('GURPS.action.rangedAttack.jet').toLocaleLowerCase() ?? 'jet')
  ) {
    accuracy.jet = true
  } else {
    text = text.replace(/^\++/, '')
    const parts = text.split('+')

    accuracy.base = extractNumber(parts[0])

    if (parts.length > 1) {
      accuracy.scope = extractNumber(parts[1])
    }
  }

  return accuracy
}

function parseBulk(text: string): Bulk {
  const bulk: Bulk = { normal: 0, giant: 0, retractingStock: false }

  text = text.trim().toLowerCase().replaceAll(' ', '').replaceAll(',', '')
  bulk.retractingStock = text.includes('*')
  const parts = text.split('/')

  bulk.normal = extractNumber(parts[0])

  if (parts.length > 1) {
    bulk.giant = extractNumber(parts[1])
  }

  return bulk
}

/* ---------------------------------------- */

function parseRange(text: string): Range {
  const range: Range = { halfDamage: 0, min: 0, max: 0, musclePowered: false, inMiles: false }

  const specialRangeStrings = ['sight', 'spec', 'skill', 'point', 'pbaoe']

  text = text.trim().toLowerCase().replaceAll(' ', '').replaceAll('×', 'x')

  // Return early for special strings, we don't parse those
  if (specialRangeStrings.some(spec => text.includes(spec)) || text.startsWith('b')) return range

  text = text.replace(',max', '/')
  text = text.replace('max', '')
  text = text.replace('1/2d', '')

  // Get muscle powered value
  range.musclePowered = text.includes('x')
  text = text.replaceAll('x', '')
  text = text.replaceAll('st', '')
  text = text.replaceAll('c/', '')

  // Check whether range is in miles
  range.inMiles = text.includes('mi')
  text = text.replaceAll('mi.', '')
  text = text.replaceAll('mi', '')
  text = text.replaceAll(',', '')

  let parts = text.split('/')

  if (parts.length > 1) {
    range.halfDamage = extractNumber(parts[0])
    parts[0] = parts[1]
  }

  parts = parts[0].split('-')

  if (parts.length > 1) {
    range.min = extractNumber(parts[0])
    range.max = extractNumber(parts[1])
  } else {
    range.max = extractNumber(parts[0])
  }

  return range
}

/* ---------------------------------------- */

function parseRecoil(text: string): Recoil {
  const recoil: Recoil = { shot: 0, slug: 0 }

  text = text.trim().toLowerCase().replaceAll(' ', '').replaceAll(',', '')

  const parts = text.split('/')

  recoil.shot = extractNumber(parts[0])

  if (parts.length > 1) {
    recoil.slug = extractNumber(parts[1])
  }

  return recoil
}

/* ---------------------------------------- */

function parseShots(text: string): Shots {
  const shots: Shots = { count: 0, inChamber: 0, duration: 0, reloadTime: 0, reloadTimeIsPerShot: false, thrown: false }

  text = text.trim().toLowerCase().replaceAll(' ', '').replaceAll(',', '')

  // We don't parse shots based on FP or duration other than in seconds.
  if (text.includes('fp') || text.includes('hrs') || text.includes('day')) return shots
  shots.thrown = text.includes('t')

  if (text.includes('spec')) return shots

  shots.count = extractNumber(text)
  text = text.replace(numberRegex, '')

  if (text.startsWith('+')) {
    shots.inChamber = extractNumber(text)
    text = text.replace(numberRegex, '')
  }

  if (text.startsWith('x')) {
    shots.duration = extractNumber(text.slice(1))
    text = text.replace(/x/, '').replace(numberRegex, '')
  }

  if (text.startsWith('(')) {
    shots.reloadTime = extractNumber(text.slice(1))
    shots.reloadTimeIsPerShot = text.includes('i')
  }

  return shots
}

/* ---------------------------------------- */

function parseRateOfFire(text: string): RateOfFire {
  const rof: RateOfFire = {
    mode1: { shotsPerAttack: 0, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
    mode2: { shotsPerAttack: 0, secondaryProjectiles: 0, fullAutoOnly: false, highCyclicControlledBursts: false },
    jet: false,
  }

  text = text.trim().toLowerCase().replaceAll(' ', '')

  if (
    text.includes('jet') ||
    text.includes('GURPS.Action.RangedAttack.jet'.toLocaleLowerCase()) ||
    text.includes(game.i18n?.localize('GURPS.Action.RangedAttack.jet').toLocaleLowerCase() ?? 'jet')
  ) {
    rof.jet = true

    return rof
  }

  const parts = text.split('/')

  rof.mode1 = parseWeaponRateOfFireMode(parts[0])

  if (parts.length > 1) {
    rof.mode2 = parseWeaponRateOfFireMode(parts[1])
  }

  return rof
}

/* ---------------------------------------- */

function parseWeaponRateOfFireMode(text: string): RateOfFireMode {
  const mode: RateOfFireMode = {
    shotsPerAttack: 0,
    secondaryProjectiles: 0,
    fullAutoOnly: false,
    highCyclicControlledBursts: false,
  }

  text = text.trim().toLowerCase().replaceAll(' ', '')
  text = text.replaceAll('.', 'x')

  mode.fullAutoOnly = text.includes('!')
  text = text.replaceAll('!', '')

  mode.highCyclicControlledBursts = text.includes('#')
  text = text.replaceAll('#', '')
  text = text.replaceAll('×', 'x')

  if (text.startsWith('x')) {
    text = '1' + text
  }

  const parts = text.split('x')

  mode.shotsPerAttack = extractNumber(parts[0])

  if (parts.length > 1) {
    mode.secondaryProjectiles = extractNumber(parts[1])
  }

  return mode
}

/* ---------------------------------------- */

export { parseAcc, parseBlock, parseBulk, parseParry, parseRange, parseRateOfFire, parseReach, parseRecoil, parseShots }
