import { fields } from '@gurps-types/foundry/index.js'
import { LengthUnit } from '@module/data/common/length.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

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

  static override get TYPE(): string {
    return ActionType.RangedAttack
  }

  /* ---------------------------------------- */

  static override LOCALIZATION_PREFIXES: string[] = ['GURPS.Action.RangedAttack']

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
  }

  /* ---------------------------------------- */

  #prepareDisplayValues(): void {
    // Prepare the Acc text
    if (this.acc.jet) this.accText = game.i18n?.localize('GURPS.Action.RangedAttack.jet') ?? ''
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
    if (this.rateOfFire.jet) this.rofText = game.i18n?.localize('GURPS.Action.RangedAttack.jet') ?? ''
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
    if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_CONVERT_RANGED) === false) return
    if (!this.item.isOwned) return

    if (!this.range.musclePowered) return

    const actor = this.actor

    if (!actor || !actor.isOfType('characterV2')) return

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
