import { fields } from '@gurps-types/foundry/index.js'
import { DisplayRangedAttack } from '@gurps-types/gurps/display-item.js'
import { ActorType } from '@module/actor/types.js'
import { LengthUnit } from '@module/data/common/length.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.js'
import {
  WeaponAccField,
  WeaponBulkField,
  WeaponRangeField,
  WeaponRateOfFireField,
  WeaponRateOfFireModeSchema,
  WeaponRecoilField,
  WeaponShotsField,
} from './fields.js'
import { ActionType } from './types.js'

class RangedAttackModel extends BaseAttack<RangedAttackSchema> {
  /* ---------------------------------------- */
  /*  Derived Values                          */
  /* ---------------------------------------- */
  accText: string = ''
  bulkText: string = ''
  rangeText: string = ''
  shotsText: string = ''
  recoilText: string = ''
  rofText: string = ''
  musclePoweredHalfDamageRange: number = 0
  musclePoweredMinRange: number = 0
  musclePoweredMaxRange: number = 0

  /* ---------------------------------------- */

  static override defineSchema(): RangedAttackSchema {
    return Object.assign(super.defineSchema(), rangedAttackSchema())
  }

  /* ---------------------------------------- */

  static override cleanData(source?: AnyMutableObject, options?: fields.DataField.CleanOptions): AnyMutableObject {
    source = super.cleanData(source, options)

    // Clean the accuracy field to ensure it is normalized.
    if ('acc' in source && typeof source.acc === 'object' && source.acc !== null) {
      if ('jet' in source.acc && typeof source.acc.jet === 'boolean' && source.acc.jet) {
        const acc = source.acc as AnyMutableObject

        acc.base = 0
        acc.scope = 0
      }

      if ('base' in source.acc && typeof source.acc.base === 'number') source.acc.base = Math.max(source.acc.base, 0)
      if ('scope' in source.acc && typeof source.acc.scope === 'number')
        source.acc.scope = Math.max(source.acc.scope, 0)
    }

    // Clean the bulk field to ensure it is normalized.
    if ('bulk' in source && typeof source.bulk === 'object' && source.bulk !== null) {
      if ('normal' in source.bulk && typeof source.bulk.normal === 'number')
        // Bulk penalties should be non-positive; clamp toward 0 from below.
        source.bulk.normal = Math.min(source.bulk.normal, 0)

      if ('giant' in source.bulk && typeof source.bulk.giant === 'number')
        // Giant bulk penalties should also be non-positive; clamp toward 0 from below.
        source.bulk.giant = Math.min(source.bulk.giant, 0)
    }

    // Clean the range field to ensure it is normalized.
    if ('range' in source && typeof source.range === 'object' && source.range !== null) {
      if ('halfDamage' in source.range && typeof source.range.halfDamage === 'number')
        source.range.halfDamage = Math.max(source.range.halfDamage, 0)
      if ('min' in source.range && typeof source.range.min === 'number')
        source.range.min = Math.max(source.range.min, 0)
      if ('max' in source.range && typeof source.range.max === 'number')
        source.range.max = Math.max(source.range.max, 0)

      if (
        'min' in source.range &&
        typeof source.range.min === 'number' &&
        'max' in source.range &&
        typeof source.range.max === 'number'
      ) {
        if (source.range.min > source.range.max) {
          ;[source.range.min, source.range.max] = [source.range.max, source.range.min]
        }
      }

      if (
        'min' in source.range &&
        typeof source.range.min === 'number' &&
        'halfDamage' in source.range &&
        typeof source.range.halfDamage === 'number'
      ) {
        if (source.range.halfDamage < source.range.min) {
          source.range.halfDamage = 0
        }
      }

      if (
        'max' in source.range &&
        typeof source.range.max === 'number' &&
        'halfDamage' in source.range &&
        typeof source.range.halfDamage === 'number'
      ) {
        if (source.range.halfDamage > source.range.max) {
          source.range.halfDamage = 0
        }
      }
    }

    // Clean the rate of fire field to ensure it is normalized.
    if ('rateOfFire' in source && typeof source.rateOfFire === 'object' && source.rateOfFire !== null) {
      const rateOfFire = source.rateOfFire as AnyMutableObject

      for (const modeKey of ['mode1', 'mode2'] as const) {
        if (modeKey in source.rateOfFire && typeof rateOfFire[modeKey] === 'object' && rateOfFire[modeKey] !== null) {
          const mode = rateOfFire[modeKey] as AnyMutableObject

          if ('shotsPerAttack' in mode && typeof mode.shotsPerAttack === 'number') {
            mode.shotsPerAttack = Math.max(Math.ceil(mode.shotsPerAttack), 0)

            if (mode.shotsPerAttack === 0) {
              mode.secondaryProjectiles = 0
              mode.fullAutoOnly = false
              mode.highCyclicControlledBursts = false

              continue
            }

            if ('secondaryProjectiles' in mode && typeof mode.secondaryProjectiles === 'number')
              mode.secondaryProjectiles = Math.max(Math.ceil(mode.secondaryProjectiles), 0)
          }
        }
      }
    }

    // Clean the recoil field to ensure it is normalized.
    if ('recoil' in source && typeof source.recoil === 'object' && source.recoil !== null) {
      if ('shot' in source.recoil && typeof source.recoil.shot === 'number')
        source.recoil.shot = Math.max(source.recoil.shot, 0)
      if ('slug' in source.recoil && typeof source.recoil.slug === 'number')
        source.recoil.slug = Math.max(source.recoil.slug, 0)
    }

    // Clean the shots field to ensure it is normalized.
    if ('shots' in source && typeof source.shots === 'object' && source.shots !== null) {
      if ('reloadTime' in source.shots && typeof source.shots.reloadTime === 'number')
        source.shots.reloadTime = Math.max(source.shots.reloadTime, 0)

      const shots = source.shots as AnyMutableObject

      if ('thrown' in source.shots && typeof source.shots.thrown === 'boolean' && source.shots.thrown) {
        shots.count = 0
        shots.inChamber = 0
        shots.duration = 0
      } else {
        const count = 'count' in shots && typeof shots.count === 'number' ? shots.count : 0
        const inChamber = 'inChamber' in shots && typeof shots.inChamber === 'number' ? shots.inChamber : 0

        shots.count = Math.max(count ?? 0, 0)

        shots.inChamber = Math.max(inChamber ?? 0, 0)

        if (shots.count === 0 && shots.inChamber === 0) {
          shots.duration = 0
          shots.reloadTime = 0
        } else {
          const duration = 'duration' in shots && typeof shots.duration === 'number' ? shots.duration : 0

          shots.duration = Math.max(duration ?? 0, 0)
        }
      }
    }

    return source
  }

  /* ---------------------------------------- */

  static override get TYPE(): string {
    return ActionType.RangedAttack
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = [...super.LOCALIZATION_PREFIXES, 'GURPS.action.rangedAttack']

  /* ---------------------------------------- */
  /*  Data Preparation                        */
  /* ---------------------------------------- */

  override prepareBaseData(): void {
    super.prepareBaseData()
    this.#prepareDisplayValues()
  }

  /* ---------------------------------------- */

  override prepareDerivedData(): void {
    super.prepareDerivedData()
    this.#prepareMusclePoweredRange()
    this.#prepareDisplayValues()
  }

  /* ---------------------------------------- */

  #prepareDisplayValues(): void {
    // Prepare the Acc text
    if (this.acc.jet) this.accText = game.i18n?.localize('GURPS.action.rangedAttack.jet') ?? ''
    else {
      this.accText = `${this.acc.base}`
      if (this.acc.scope !== 0) this.accText += `+${this.acc.scope}`
    }

    // Prepare the bulk text
    if (this.bulk.normal >= 0 && this.bulk.giant >= 0) {
      this.bulkText = ''
    } else {
      this.bulkText = `${this.bulk.normal}`
      if (this.bulk.giant !== 0 && this.bulk.giant !== this.bulk.normal) this.bulkText += `/${this.bulk.giant}`
      if (this.bulk.retractingStock) this.bulkText += '*'
    }

    // Prepare the range text (before resolving muscle-powered range)
    this.#prepareRangeValue(false)

    // Prepare the rate of fire text
    if (this.rateOfFire.jet) this.rofText = game.i18n?.localize('GURPS.action.rangedAttack.jet') ?? ''
    else {
      const mode1Text = this.#prepareRateofFireText(this.rateOfFire.mode1)
      const mode2Text = this.#prepareRateofFireText(this.rateOfFire.mode2)

      if (!mode1Text) this.rofText = mode2Text
      else this.rofText = mode1Text + (mode2Text ? `/${mode2Text}` : '')
    }

    // Prepare the recoil text
    if (this.recoil.shot === 0 && this.recoil.slug === 0) this.recoilText = ''
    else {
      this.recoilText = `${this.recoil.shot}`
      if (this.recoil.slug !== 0) this.recoilText += `/${this.recoil.slug}`
    }

    // Prepare the shots text
    if (this.shots.thrown) this.shotsText = 'T'
    else {
      if (this.shots.count <= 0 && this.shots.inChamber <= 0) {
        this.shotsText = ''
      } else {
        this.shotsText = `${Math.max(this.shots.count, 0)}`

        if (this.shots.inChamber > 0) this.shotsText += `+${this.shots.inChamber}`
        if (this.shots.duration > 0) this.shotsText += `x${this.shots.duration}s`
      }
    }

    if (this.shots.reloadTime > 0) {
      const perShotSuffix = this.shots.reloadTimeIsPerShot ? 'i' : ''

      this.shotsText += `(${this.shots.reloadTime.toString()}${perShotSuffix})`
    }
  }

  /* ---------------------------------------- */

  #prepareRateofFireText(mode: fields.SchemaField.InitializedData<WeaponRateOfFireModeSchema>): string {
    if (mode.shotsPerAttack <= 0) return ''
    let text = mode.shotsPerAttack.toString()

    if (mode.secondaryProjectiles > 0) text += `x${mode.secondaryProjectiles}`
    if (mode.fullAutoOnly) text += '!'
    if (mode.highCyclicControlledBursts) text += '#'

    return text
  }

  /* ---------------------------------------- */

  #prepareMusclePoweredRange(): void {
    if (game.settings?.get(GURPS.SYSTEM_NAME, 'convert-ranged') === false) return
    if (!this.item.isOwned) return

    if (!this.range.musclePowered) return

    const actor = this.actor

    if (!actor || !actor.isOfType(ActorType.Character)) return

    const st = actor.system.attributes.ST.value

    this.musclePoweredHalfDamageRange = this.range.halfDamage * st
    this.musclePoweredMinRange = this.range.min * st
    this.musclePoweredMaxRange = this.range.max * st

    this.#prepareRangeValue(true)
  }

  /* ---------------------------------------- */

  #prepareRangeValue(musclePoweredIsResolved = false): void {
    const useMusclePoweredRange = this.range.musclePowered && musclePoweredIsResolved
    // Prepare the range text (before resolving muscle-powered range)
    let range = ''

    if (this.range.halfDamage !== 0) {
      if (this.range.musclePowered && !musclePoweredIsResolved) range += 'x'
      range += useMusclePoweredRange
        ? this.musclePoweredHalfDamageRange.toLocaleString()
        : this.range.halfDamage.toLocaleString()
      range += '/'
    }

    if (this.range.min !== 0 || this.range.max !== 0) {
      if (this.range.min !== 0 && this.range.min !== this.range.max) {
        if (this.range.musclePowered && !musclePoweredIsResolved) range += 'x'
        range += useMusclePoweredRange ? this.musclePoweredMinRange.toLocaleString() : this.range.min.toLocaleString()
        range += '-'
      }

      if (this.range.musclePowered && !musclePoweredIsResolved) range += 'x'
      range += useMusclePoweredRange ? this.musclePoweredMaxRange.toLocaleString() : this.range.max.toLocaleString()
      // NOTE: May want to localize this.
      if (this.range.inMiles) range += LengthUnit.Mile
    }

    this.rangeText = range
  }

  /* ---------------------------------------- */

  override applyBonuses(bonuses: AnyObject[]): void {
    for (const bonus of bonuses) {
      // All melee attacks are affected by DX
      if (bonus.type === 'attribute' && bonus.attrkey === 'DX') {
        this.level += bonus.mod as number
      }

      if (bonus.type === 'attack' && bonus.isRanged) {
        if (this.name && this.name.match(makeRegexPatternFrom(bonus.name as string, false))) {
          this.level += bonus.mod as number
        }
      }
    }
  }

  /* ---------------------------------------- */

  override toDisplayItem(): DisplayRangedAttack {
    const fullName = super.toDisplayItem().fullName

    return foundry.utils.mergeObject(super.toDisplayItem(), {
      acc: this.accText,
      bulk: this.bulkText,
      halfDamageRange: this.range.halfDamage.toLocaleString(),
      maxRange: this.range.max.toLocaleString(),
      minRange: this.range.min.toLocaleString(),
      range: this.rangeText,
      recoil: this.recoilText,
      rof: this.rofText,
      shots: this.shotsText,
      otf: {
        level: `R:"${fullName}"`,
        damage: `D:"${fullName}"`,
      },
    })
  }
}

/* ---------------------------------------- */

const rangedAttackSchema = () => {
  return {
    /** The accuracy modifier for this attack */
    acc: new WeaponAccField(),

    /** The current ammo count for this attack */
    ammo: new fields.NumberField({ required: true, nullable: true, initial: null }),

    /** The bulk of the weapon used for this attack */
    bulk: new WeaponBulkField(),

    /** The range of this attack */
    range: new WeaponRangeField(),

    rateOfFire: new WeaponRateOfFireField(),

    /** The recoil values for this attack */
    recoil: new WeaponRecoilField(),

    /** The number of shots and reload round count for this attack. */
    shots: new WeaponShotsField(),
  }
}

type RangedAttackSchema = BaseAttack.Schema & ReturnType<typeof rangedAttackSchema>

/* ---------------------------------------- */

export { RangedAttackModel, type RangedAttackSchema }
