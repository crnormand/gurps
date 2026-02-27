import { fields } from '@gurps-types/foundry/index.js'
import { LengthUnit } from '@module/data/common/length.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '@util/utilities.js'
import { AnyObject } from 'fvtt-types/utils'

import { BaseAttack } from './base-attack.js'
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
      this.shotsText += `(${this.shots.reloadTime.toString() + this.shots.reloadTimeIsPerShot ? 'i' : ''}s`
    }
  }

  /* ---------------------------------------- */

  #prepareRateofFireText(mode: fields.SchemaField.InitializedData<RateOfFireModeSchema>): string {
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
    acc: new fields.SchemaField({
      /** The base accuracy modifier for this attack */
      base: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The scope modifier for this attack, which is added to the base accuracy modifier to determine the final accuracy modifier. */
      scope: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** Is this attack a jet attack? */
      jet: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    /** The current ammo count for this attack */
    ammo: new fields.NumberField({ required: true, nullable: true, initial: null }),

    /** The bulk of the weapon used for this attack */
    bulk: new fields.SchemaField({
      /** The normal bulk value of the weapon */
      normal: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The bulk value of the weapon when used by a giant character */
      giant: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** Does this weapon have retracting stock? */
      retractingStock: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    /** The range of this attack */
    range: new fields.SchemaField({
      /** The range after which the attack deals only half damage. */
      halfDamage: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The minimum range of this attack */
      min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The maximum range of this attack */
      max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** Is this attack considered muscle-powered for the purposes of range calculation? */
      musclePowered: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** Is the range of this attack measured in miles instead of yards? */
      inMiles: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    rateOfFire: new fields.SchemaField({
      /** The primary fire mode for this attack */
      mode1: new fields.SchemaField(rateOfFireModeSchema(), { required: true, nullable: false }),
      /** The secondary fire mode for this attack, if applicable */
      mode2: new fields.SchemaField(rateOfFireModeSchema(), { required: true, nullable: false }),
      /** Is this attack considered a jet attack for the purposes of rate of fire? */
      jet: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    /** The recoil values for this attack */
    recoil: new fields.SchemaField({
      /** The normal recoil value for this attack */
      shot: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** An alternative recoil value for this attack, e.g. when using slugs for a shotgun instead of pellets */
      slug: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    }),

    /** The number of shots and reload round count for this attack. */
    shots: new fields.SchemaField({
      /** The number of shots carried in the megazine (or other implement) of this weapon, as appropriate */
      count: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The number of shots currently loaded in the weapon's chamber (if any) */
      inChamber: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The number of seconds for which this attack fires (applicable for e.g. flamethrowers) */
      duration: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** The number of rounds required to reload this weapon once all shots are expended */
      reloadTime: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      /** Whether the reload time is per shot (e.g. revolvers) or for the entire reload action (e.g. magazines) */
      reloadTimeIsPerShot: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      /** Is this attack considered a thrown weapon for the purposes of shots and reload? */
      thrown: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    }),

    /** Unused field from previous iterations of this schema */
    // legalityclass: new fields.StringField({ required: true, nullable: false }),
  }
}

type RangedAttackSchema = BaseAttack.Schema & ReturnType<typeof rangedAttackSchema>

/* ---------------------------------------- */

const rateOfFireModeSchema = () => {
  return {
    /** The maximum number of times this weapon can be shot in a single attack action */
    shotsPerAttack: new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      label: 'GURPS.Action.RangedAttack.FIELDS.rateOfFire.shotsPerAttack',
    }),
    /** The number of secondary projectiles released by every attack (e.g. for a shotgun) */
    secondaryProjectiles: new fields.NumberField({
      required: true,
      nullable: false,
      initial: 0,
      label: 'GURPS.Action.RangedAttack.FIELDS.rateOfFire.secondaryProjectiles',
    }),
    /** Is this weapon only able to fire in fully automatic mode? */
    fullAutoOnly: new fields.BooleanField({
      required: true,
      nullable: false,
      initial: false,
      label: 'GURPS.Action.RangedAttack.FIELDS.rateOfFire.fullAutoOnly',
    }),
    /** Does this weapon fire in high-cyclic controlled bursts? */
    highCyclicControlledBursts: new fields.BooleanField({
      required: true,
      nullable: false,
      initial: false,
      label: 'GURPS.Action.RangedAttack.FIELDS.rateOfFire.highCyclicControlledBursts',
    }),
  }
}

type RateOfFireModeSchema = ReturnType<typeof rateOfFireModeSchema>

/* ---------------------------------------- */

export { RangedAttackModel, type RangedAttackSchema, type RateOfFireModeSchema }
