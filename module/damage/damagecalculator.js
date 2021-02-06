'use strict'

import * as Settings from '../../lib/miscellaneous-settings.js'
import * as HitLocation from '../hitlocation/hitlocation.js'
import * as DamageTables from './damage-tables.js'

/* 
  Crippling injury:
 
  Limb (arm, leg, wing, striker, or prehensile tail): Injury over HP/2.
  Extremity (hand, foot, tail, fin, or extraneous head): Injury over HP/3.
  Eye: Injury over HP/10.
 */
const bluntTraumaTypes = ['cr', 'cut', 'imp', 'pi-', 'pi', 'pi+', 'pi++']
// const limbs = ['Left Arm', 'Right Arm', 'Left Leg', 'Right Leg']
// const extremities = ['Hand', 'Foot']
const head = ['Skull', 'Face', 'Eye']
const piercing = ['pi-', 'pi', 'pi+', 'pi++']
// const crippleableLocations = [...limbs, ...extremities, 'Eye']

const DIFFUSE = 'diffuse'
const HOMOGENOUS = 'homogenous'

// -1 means 'Ignores DR'
const armorDivisorSteps = [-1, 100, 5, 3, 2, 1]

export class DamageCalculator {
  constructor(defender, damageData) {
    this._useBluntTrauma = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BLUNT_TRAUMA)
    this._useLocationModifiers = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_LOCATION_MODIFIERS)
    this._useArmorDivisor = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_APPLY_DIVISOR)

    this._defender = defender
    this._attacker = damageData.attacker

    this._defaultWoundingModifiers = Object.keys(DamageTables.woundModifiers).reduce(function (r, e) {
      if (!DamageTables.woundModifiers[e].nodisplay) r[e] = DamageTables.woundModifiers[e]
      return r
    }, {})

    if (Object.keys(this._defaultWoundingModifiers).includes(damageData.damageType))
      this._damageType = damageData.damageType
    else {
      let temp = DamageTables.damageTypeMap[damageData.damageType]
      if (temp) this._damageType = temp
      else this._damageType = 'none'
    }

    this._armorDivisor = damageData.armorDivisor
    this._basicDamage = damageData.damage

    this._applyTo = this._damageType === 'fat' ? 'FP' : 'HP'

    this._hitLocation = this._defender.defaultHitLocation
    this._previousHitLocation = this._hitLocation
    this._userEnteredDR = 0

    // the wounding modifier selected using the radio buttons
    this._userEnteredWoundModifier = 1
    this._additionalWoundModifier = 0

    this._isRangedHalfDamage = false
    this._isFlexibleArmor = false
    this._bluntTrauma = null

    this._isVulnerable = false
    this._vulnerabilityMultiple = 2

    this._isHardenedDR = false
    this._hardenedDRLevel = 1

    this._isInjuryTolerance = false
    this._injuryToleranceType = null
    this._maxInjuryForDiffuse = null

    this._isExplosion = false
    this._hexesFromExplosion = 1
    this._explosionDivisor = 1
  }

  get attacker() {
    return this._attacker
  }
  get HP() {
    return this._defender.data.data.HP
  }
  get FP() {
    return this._defender.data.data.FP
  }
  get attributes() {
    return this._defender.data.data.attributes
  }
  get allHitLocations() {
    return this._defender.data.data.hitlocations
  }
  get hitLocationsWithDR() {
    return this._defender.hitLocationsWithDR
  }

  get _hitLocationRole() {
    let hitLocation = this._defender._hitLocationRolls[this._hitLocation]
    if (!!hitLocation?.role) {
      return hitLocation.role
    }
    return null
  }

  get effectiveWoundModifiers() {
    let table = this.defaultWoundModifiers

    if (this._useLocationModifiers) {
      switch (this._hitLocation) {
        case 'Vitals':
          table = this.vitalsWoundModifiers
          break

        case 'Skull':
        case 'Eye':
          table = this.skullEyeWoundModifiers
          break

        case 'Face':
          table = this.faceWoundModifiers
          break

        case 'Neck':
          table = this.neckWoundModifiers
          break

        default: {
          if ([HitLocation.EXTREMITY, HitLocation.LIMB].includes(this._hitLocationRole))
            table = this.extremityWoundModifiers
          else table = this.defaultWoundModifiers
        }
      }
    }

    if (this._isInjuryTolerance) {
      switch (this._injuryToleranceType) {
        case 'unliving':
          table = JSON.parse(JSON.stringify(table))
          this._modifyForInjuryTolerance(table['imp'], 1)
          this._modifyForInjuryTolerance(table['pi++'], 1)
          this._modifyForInjuryTolerance(table['pi+'], 0.5)
          this._modifyForInjuryTolerance(table['pi'], 1 / 3)
          this._modifyForInjuryTolerance(table['pi-'], 0.2)
          break

        // TODO Homogenous includes the benefits of No Brain and No Vitals.

        // No Brain: You may have a head, but a blow to the skull or eye is treated no
        // differently than a blow to the face (except that an eye injury can still cripple
        // that eye).

        // No Vitals: You have no vital organs (such as a heart or engine) that attackers can
        // target for extra damage. Treat hits to the 'vitals' or 'groin' as torso hits.
        case HOMOGENOUS:
          // Homogenous: Ignore all wounding modifiers for hit location.
          table = JSON.parse(JSON.stringify(this.defaultWoundModifiers))
          this._modifyForInjuryTolerance(table['imp'], 0.5)
          this._modifyForInjuryTolerance(table['pi++'], 0.5)
          this._modifyForInjuryTolerance(table['pi+'], 1 / 3)
          this._modifyForInjuryTolerance(table['pi'], 0.2)
          this._modifyForInjuryTolerance(table['pi-'], 0.1)
          break

        // TODO Diffuse: This makes you immune to crippling injuries and reduces the damage you
        // suffer from most physical blows. Diffuse includes all the benefits of No Blood,
        // No Brain, and No Vitals.
        case DIFFUSE:
          // Diffuse: Ignore all wounding modifiers for hit location.
          table = JSON.parse(JSON.stringify(this.defaultWoundModifiers))
          break

        default:
        // do nothing
      }
    }

    return table
  }

  _modifyForInjuryTolerance(result, value) {
    let m = Math.min(result.multiplier, value)

    if (m <= result.multiplier) {
      result.multiplier = m
      result.changed = 'injury-tolerance'
    }
  }

  get defaultWoundModifiers() {
    return this._defaultWoundingModifiers
  }

  get vitalsWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter((key) => ['imp', ...piercing].includes(key))
      .forEach((key) => {
        results[key].multiplier = 3
        results[key].changed = 'hitlocation'
      })
    return results
  }

  get skullEyeWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter((key) => key !== 'tox') // everything EXCEPT toxic
      .forEach((key) => {
        results[key].multiplier = 4
        results[key].changed = 'hitlocation'
      })
    return results
  }

  get faceWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    results['cor'].multiplier = 1.5
    results['cor'].changed = 'hitlocation'
    return results
  }

  get neckWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    results['cr'].multiplier = 1.5
    results['cor'].multiplier = 1.5
    results['cut'].multiplier = 2
    results['cr'].changed = 'hitlocation'
    results['cor'].changed = 'hitlocation'
    results['cut'].changed = 'hitlocation'
    return results
  }

  get extremityWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter((key) => ['imp', 'pi+', 'pi++'].includes(key))
      .forEach((key) => {
        results[key].multiplier = 1
        results[key].changed = 'hitlocation'
      })
    return results
  }

  // --- DAMAGE CALCULATION ---
  // Basic Damage = Number rolled on the dice.
  //
  // Effective Damage = Basic Damage, unless this is a ranged attack and the range is beyond
  //    the weapon's 1/2D range, in which case we divide the damage by 2.
  //
  // DR = The DR of the Hit Location.
  //
  // Effective DR = DR adjusted for armor divisor, if any. Hardened DR reduces the effects of the
  //    armor divisor.
  //
  // Penetrating Damage = Effective Damage - Effective DR.
  //
  // Wounding Modifier = wounding modifier based on damage type.
  //
  // Total Wounding Modifier = Wounding Modifier + any additional (user entered) wounding modifier
  //    + any Vulnerability multiplier.
  //
  // Injury = Penetrating Damage x Total Wounding Modifier x Explosion divider.
  //
  // Calculated Blunt Trauma = 1/10 of the Effective Damage for the appropriate damage types; 1/5 of
  //    Effective Damage if damage type is 'cr' (Crushing).
  //
  // Effective Blunt Trauma = Calculated Blunt Trauma, unless the user overrode it with his own value,
  //    in which case the user entered value is used.
  //
  // Unmodified Points to Apply = Injury, unless injury is zero and there was potential
  //    Effective Blunt Trauma, in which case the value is equal to the Effective Blunt Trauma.
  //
  // Points to Apply = Unmodified Points to Apply, adjusted by the maximum amount of damage per hit
  //    location if using "Hit Location Wounding Modifiers".

  get effectiveDamage() {
    return this._isRangedHalfDamage ? Math.floor(this._basicDamage / 2) : this._basicDamage
  }

  // return the DR indicated by the Hit Location
  get DR() {
    if (this._hitLocation === 'Random') return 0

    if (this._hitLocation === 'User Entered') return this._userEnteredDR

    if (this._hitLocation === 'Large-Area') {
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = 0

      // find the location with the lowest DR
      for (let value of this._defender.hitLocationsWithDR.filter((it) => it.roll.length > 0)) {
        if (value.dr < lowestDR) lowestDR = value.dr
        if (value.where === 'Torso') torsoDR = value.dr
      }
      // return the average of torso and lowest dr
      return Math.ceil((lowestDR + torsoDR) / 2)
    }

    return this._defender.hitLocationsWithDR.filter((it) => it.where === this._hitLocation).map((it) => it.dr)[0]
  }

  get effectiveArmorDivisor() {
    // Armor Divisors do not apply to Explosions, (B414)
    if (this._isExplosion) return 1

    if (this._armorDivisor > 1 && this._isHardenedDR) {
      let maxIndex = armorDivisorSteps.length - 1
      let index = armorDivisorSteps.indexOf(this._armorDivisor)
      if (index !== -1) {
        index = Math.min(index + this._hardenedDRLevel, maxIndex)
        return armorDivisorSteps[index]
      }
    }
    return this._armorDivisor
  }

  // figure out the current DR modified by armor divisor, if necessary
  get effectiveDR() {
    let dr = this.DR
    if (this._useArmorDivisor && this._armorDivisor && this._armorDivisor !== 0) {
      // -1 divisor means "Ignore DR"
      if (this.effectiveArmorDivisor === -1) return 0

      let tempDR = this.effectiveArmorDivisor < 1 && dr === 0 ? 1 : dr
      return Math.floor(tempDR / this.effectiveArmorDivisor)
    }
    return dr
  }

  get penetratingDamage() {
    return Math.max(0, this.effectiveDamage - this.effectiveDR)
  }

  get woundingModifier() {
    if (this._damageType === 'none') return 1
    if (this._damageType === 'User Entered') return this._userEnteredWoundModifier

    return this.effectiveWoundModifiers[this._damageType].multiplier
  }

  get effectiveVulnerabilityMultiple() {
    return this._isVulnerable ? this._vulnerabilityMultiple : 1
  }

  get totalWoundingModifier() {
    return (this.woundingModifier + this._additionalWoundModifier) * this.effectiveVulnerabilityMultiple
  }

  /**
   * Injury is equal to penetrating damage x total wounding modifiers.
   */
  get injury() {
    this._maxInjuryForDiffuse = null
    let injury = Math.floor(this.penetratingDamage * this.totalWoundingModifier / this.explosionDivisor)

    // B380: A target with Injury Tolerance (Diffuse) is even harder to damage!
    if (this._isInjuryTolerance && this._injuryToleranceType === DIFFUSE) {
      // ...Impaling and piercing attacks (of any size) never do more than 1 HP of injury,
      // regardless of penetrating damage!
      if (['imp', ...piercing].includes(this._damageType)) {
        this._maxInjuryForDiffuse = Math.min(1, injury)
        return this._maxInjuryForDiffuse
      }

      // ...Other attacks can never do more than 2 HP of injury.
      this._maxInjuryForDiffuse = Math.min(2, injury)
      return this._maxInjuryForDiffuse
    }

    return injury
  }

  get calculatedBluntTrauma() {
    if (this.effectiveDamage === 0 || this.penetratingDamage > 0) return 0
    if (!bluntTraumaTypes.includes(this._damageType)) return 0
    if (this._damageType === 'cr') return Math.floor(this.effectiveDamage / 5)
    return Math.floor(this.effectiveDamage / 10)
  }

  get effectiveBluntTrauma() {
    return this._bluntTrauma === null ? this.calculatedBluntTrauma : this._bluntTrauma
  }

  /**
   * This is the damage to apply before applying any maximum based on Location.
   */
  get unmodifiedPointsToApply() {
    let injury = this.injury
    let pointsToApply =
      injury === 0 ? (this._isFlexibleArmor && this._useBluntTrauma ? this.effectiveBluntTrauma : 0) : injury
    return pointsToApply
  }

  /**
   * Actual number of HP to apply is the amount of injury, or the effective blunt trauma.
   * Set a limit of the max needed to cripple the location.
   */
  get pointsToApply() {
    let pointsToApply = this.unmodifiedPointsToApply
    if (this._useLocationModifiers) {
      if ([HitLocation.EXTREMITY, HitLocation.LIMB].includes(this._hitLocationRole)) {
        return Math.min(pointsToApply, Math.floor(this.locationMaxHP))
      }
    }
    return pointsToApply
  }

  get calculatedShock() {
    let factor = Math.max(1, Math.floor(this.HP.max / 10))
    let shock = Math.min(4, Math.floor(this.pointsToApply / factor))
    return shock
  }

  get isMajorWound() {
    return this.pointsToApply > this.HP.max / 2
  }

  get penaltyToHTRollForStunning() {
    // Diffuse or Homogenous: Ignore all knockdown modifiers for hit location.
    if (this._isInjuryTolerance && (this._injuryToleranceType === DIFFUSE || this._injuryToleranceType === HOMOGENOUS))
      return 0

    if (['Face', 'Vitals', 'Groin'].includes(this._hitLocation)) return 5

    // No Brain (Diffuse or Homogenous) - blows to skull or eye are no different than a blow to
    // the face, except that eyes can still be crippled. (Handled earlier in this method.)
    if (this.isMajorWound && ['Eye', 'Skull', 'Brain'].includes(this._hitLocation)) return 10

    return 0
  }

  get _isCrippleableLocation() {
    return [HitLocation.EXTREMITY, HitLocation.LIMB].includes(this._hitLocationRole) || this._hitLocation === 'Eye'
  }

  get isCripplingInjury() {
    if (this._useLocationModifiers && this._isCrippleableLocation) {
      return this.unmodifiedPointsToApply > this.locationMaxHP
    }
    return false
  }

  get locationMaxHP() {
    if (this._hitLocationRole === HitLocation.LIMB) return this.HP.max / 2
    if (this._hitLocationRole === HitLocation.EXTREMITY) return this.HP.max / 3
    if (this._hitLocation === 'Eye') return this.HP.max / 10
    return this.HP.max
  }

  get locationMaxHPAsInt() {
    return Math.floor(this.locationMaxHP)
  }

  get isInjuryReducedByLocation() {
    return this._useLocationModifiers && this.isCripplingInjury && this._hitLocation !== 'Eye'
  }

  get isKnockbackEligible() {
    if (this._damageType === 'cr' && this._basicDamage > 0) return true

    return this._damageType === 'cut' && this._basicDamage > 0 && this.penetratingDamage === 0
  }

  /*
   * let effect = {
   *   type: <string: 'shock' | 'majorwound' | 'headvitalshit' | 'crippling' | 'knockback'>,
   *   modifier: <int: any penalty/modifier due to effect>,
   *   amount: <int: any associated value/level of effect>,
   *   detail: <string: any required information for effect>
   * }
   */
  get effects() {
    let _effects = []
    let shock = this.calculatedShock

    if (this.pointsToApply > 0) {
      if (shock > 0) {
        _effects.push({
          type: 'shock',
          amount: shock,
        })
      }

      let isMajorWound = false
      if (this.isMajorWound) {
        isMajorWound = true
        _effects.push({
          type: 'majorwound',
          modifier: this.penaltyToHTRollForStunning,
        })
      } else if ([...head, 'Vitals'].includes(this._hitLocation) && shock > 0) {
        _effects.push({
          type: 'headvitalshit',
          detail: this._hitLocation,
          modifier: this.penaltyToHTRollForStunning,
        })
      }

      // Crippling Injury is also a Major Wound
      if (this.isCripplingInjury) {
        _effects.push({
          type: 'crippling',
          amount: Math.floor(this.locationMaxHP),
          detail: this._hitLocation,
          reduceInjury: this.isInjuryReducedByLocation,
        })
        if (!isMajorWound)
          _effects.push({
            type: 'majorwound',
            modifier: this.penaltyToHTRollForStunning,
          })
      }
    }

    if (this.isKnockbackEligible) {
      let knockback = Math.floor(this._basicDamage / (this.attributes.ST.value - 2))
      if (knockback > 0) {
        let modifier = knockback - 1
        _effects.push({
          type: 'knockback',
          amount: knockback,
          modifier: modifier,
        })
      }
    }

    // if (this.injury === 0 && this._isFlexibleArmor && this._useBluntTrauma) {
    //     let trauma = this.effectiveBluntTrauma
    //     if (trauma > 0) {
    //         _effects.push({
    //             type: 'blunttrauma',
    //             amount: trauma
    //         })
    //     }
    // }

    console.log(this)
    return _effects
  }

  randomizeHitLocation() {
    let roll3d = Roll.create('3d6')
    roll3d.roll()
    let total = roll3d.total

    let loc = this._defender.hitLocationsWithDR.filter((it) => it.roll.includes(total))
    if (!!loc && loc.length > 0) this._hitLocation = loc[0].where
    else ui.notifications.warn(`There are no hit locations defined for #${total}`)
    return roll3d
  }

  get basicDamage() {
    return this._basicDamage
  }
  set basicDamage(value) {
    this._basicDamage = value
  }

  get armorDivisor() {
    return this._armorDivisor
  }

  get damageType() {
    return this._damageType
  }
  set damageType(type) {
    this._damageType = type
  }

  get applyTo() {
    return this._applyTo
  }
  set applyTo(value) {
    this._applyTo = value
  }

  get hitLocation() {
    return this._hitLocation
  }
  set hitLocation(text) {
    this._hitLocation = text
  }

  get userEnteredDR() {
    return this._userEnteredDR
  }
  set userEnteredDR(value) {
    this._userEnteredDR = value
  }

  get useArmorDivisor() {
    return this._useArmorDivisor
  }
  set useArmorDivisor(value) {
    this._useArmorDivisor = value
  }

  get userEnteredWoundModifier() {
    return this._userEnteredWoundModifier
  }
  set userEnteredWoundModifier(value) {
    this._userEnteredWoundModifier = value
  }

  get additionalWoundModifier() {
    return this._additionalWoundModifier
  }
  set additionalWoundModifier(value) {
    this._additionalWoundModifier = value
  }

  get useBluntTrauma() {
    return this._useBluntTrauma
  }
  set useBluntTrauma(value) {
    this._useBluntTrauma = value
  }

  get bluntTrauma() {
    return this._bluntTrauma
  }
  set bluntTrauma(value) {
    this._bluntTrauma = value
  }

  get isFlexibleArmor() {
    return this._isFlexibleArmor
  }
  set isFlexibleArmor(value) {
    this._isFlexibleArmor = value
  }

  get useLocationModifiers() {
    return this._useLocationModifiers
  }
  set useLocationModifiers(value) {
    this._useLocationModifiers = value
  }

  get isRangedHalfDamage() {
    return this._isRangedHalfDamage
  }
  set isRangedHalfDamage(value) {
    this._isRangedHalfDamage = value
  }

  get isVulnerable() {
    return this._isVulnerable
  }
  set isVulnerable(value) {
    this._isVulnerable = value
  }

  get vulnerabilityMultiple() {
    return this._vulnerabilityMultiple
  }
  set vulnerabilityMultiple(value) {
    this._vulnerabilityMultiple = value
  }

  get hasAdditionalWoundingModifiers() {
    return this.additionalWoundModifier > 0 || this.effectiveVulnerabilityMultiple > 0
  }

  get isHardenedDR() {
    return this._isHardenedDR
  }
  set isHardenedDR(value) {
    this._isHardenedDR = value
  }

  get hardenedDRLevel() {
    return this._hardenedDRLevel
  }
  set hardenedDRLevel(value) {
    this._hardenedDRLevel = value
  }

  get isInjuryTolerance() {
    return this._isInjuryTolerance
  }
  set isInjuryTolerance(value) {
    this._isInjuryTolerance = value
  }

  get injuryToleranceType() {
    return this._injuryToleranceType
  }
  set injuryToleranceType(value) {
    this._injuryToleranceType = value
  }

  get isWoundModifierAdjustedForInjuryTolerance() {
    let table = this.effectiveWoundModifiers
    let entries = Object.keys(table).filter((key) => table[key].changed === 'injury-tolerance')
    return entries.length > 0
  }

  get isWoundModifierAdjustedForLocation() {
    let table = this.effectiveWoundModifiers
    let entries = Object.keys(table).filter((key) => table[key].changed === 'hitlocation')
    return entries.length > 0
  }

  get isBluntTraumaInjury() {
    return this.injury === 0 && this._isFlexibleArmor && this._useBluntTrauma && this.effectiveBluntTrauma > 0
  }

  get maxInjuryForDiffuse() {
    return this._maxInjuryForDiffuse
  }

  get isExplosion() { return this._isExplosion }
  set isExplosion(value) {
    if (value && !this._isExplosion) {
      this._previousHitLocation = this._hitLocation
      this._hitLocation = 'Large-Area'
    } else if (!value && this._isExplosion) {
      this._hitLocation = this._previousHitLocation
    }
    this._isExplosion = value
  }

  get hexesFromExplosion() {
    return this._hexesFromExplosion
  }
  set hexesFromExplosion(value) {
    this._hexesFromExplosion = value
  }

  get explosionDivisor() {
    if (this.isExplosion) {
      return this._hexesFromExplosion * 3
    }
    return 1
  }
}
