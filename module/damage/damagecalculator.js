'use strict'

import * as settings from '../../lib/miscellaneous-settings.js'
import * as hitlocation from '../hitlocation/hitlocation.js'
import { DamageTables } from './damage-tables.js'
import { objectToArray } from '../../lib/utilities.js'

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
const armorDivisorSteps = [-1, 100, 10, 5, 3, 2, 1]

export class CompositeDamageCalculator {
  /**
   * Create a composite damage calculator, which is a damage calculator that
   *  wraps multiple damage calculators.
   *
   * The basic assumption made by this composite damage calculation is that
   * all variables (hit location, armor divisor, damage type, etc) are the same
   * for every damage roll; the only thing that is different is the amount of
   * damage.
   *
   * @param {*} defender
   * @param {Array} damageData
   */
  constructor(defender, damageData) {
    this._useBluntTrauma = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BLUNT_TRAUMA)
    this._useLocationModifiers = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_LOCATION_MODIFIERS)
    this._useArmorDivisor = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_APPLY_DIVISOR)

    this._defender = defender

    this._calculators = damageData.map(data => new DamageCalculator(this, data))

    this.viewId = this._calculators.length == 1 ? 0 : 'all'

    this._defaultWoundingModifiers = Object.keys(DamageTables.woundModifiers).reduce(function (r, e) {
      if (!DamageTables.woundModifiers[e].nodisplay) r[e] = DamageTables.woundModifiers[e]
      return r
    }, {})

    this._attacker = damageData[0].attacker

    if (Object.keys(this._defaultWoundingModifiers).includes(damageData[0].damageType))
      this._damageType = damageData[0].damageType
    else {
      let temp = DamageTables.translate(damageData[0].damageType)
      if (temp) this._damageType = temp
      else this._damageType = 'none'
    }

    if (!!CompositeDamageCalculator.isResourceDamageType(this._damageType)) {
      this.applyTo = this._damageType
    } else {
      this._applyTo = this._damageType === 'fat' ? 'FP' : 'HP'
    }

    this._armorDivisor = damageData[0].armorDivisor
    if (this._armorDivisor === 0) {
      this._useArmorDivisor = false
    }

    this._hitLocation = this._defender.defaultHitLocation
    this._previousHitLocation = this._hitLocation
    this._userEnteredDR = null

    // the wounding modifier selected using the radio buttons
    this._userEnteredWoundModifier = 1
    this._additionalWoundModifier = 0

    this._isRangedHalfDamage = false
    this._isFlexibleArmor = false

    this._isVulnerable = false
    this._vulnerabilityMultiple = 2

    this._isHardenedDR = false
    this._hardenedDRLevel = 1

    this._isInjuryTolerance = false
    this._injuryToleranceType = null

    // Injury Tolerance (Damage Reduction) is handled separately from other types of IT
    this._useDamageReduction = false
    this._damageReductionLevel = null

    this._isExplosion = false
    this._hexesFromExplosion = 1
    this._explosionDivisor = 1

    this._isShotgun = false
    this._shotgunRofMultiplier = 9
  }

  static isResourceDamageType(damageType) {
    let modifier = DamageTables.woundModifiers[damageType]
    return !!modifier && !!DamageTables.woundModifiers[damageType].resource
  }

  get(viewId) {
    if (viewId === 'all') return this
    return this._calculators[viewId]
  }

  get additionalWoundModifier() {
    return this._additionalWoundModifier
  }

  set additionalWoundModifier(value) {
    this._additionalWoundModifier = value
  }

  get allHitLocations() {
    return this._defender.data.data.hitlocations
  }

  get armorDivisor() {
    return this._armorDivisor
  }

  set armorDivisor(value) {
    this._armorDivisor = value
  }

  get useArmorDivisor() {
    return this._useArmorDivisor
  }

  get applyTo() {
    return this._applyTo
  }

  set applyTo(value) {
    this._applyTo = value
  }

  get attacker() {
    return this._attacker
  }

  get attributes() {
    return this._defender.data.data.attributes
  }

  /**
   * Override at the individual dice roll level.
   */
  get basicDamage() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].basicDamage
  }

  set basicDamage(value) {
    if (this._viewId === 'all') return
    this._calculators[this._viewId].basicDamage = value
  }

  get calculators() {
    return this._calculators
  }

  get damageType() {
    return this._damageType
  }

  set damageType(type) {
    this._damageType = type
  }

  get defaultWoundModifiers() {
    return this._defaultWoundingModifiers
  }

  // return the DR indicated by the Hit Location
  get DR() {
    if (this._userEnteredDR !== null) return this._userEnteredDR

    if (this._hitLocation === 'Random') return 0

    // if (this._hitLocation === 'User Entered') return this._userEnteredDR

    if (this._hitLocation === 'Large-Area') {
      let lowestDR = Number.POSITIVE_INFINITY
      let torsoDR = 0

      // find the location with the lowest DR
      for (let value of this._defender.hitLocationsWithDR.filter(it => it.roll.length > 0)) {
        if (value.dr < lowestDR) lowestDR = value.dr
        if (value.where === 'Torso') torsoDR = value.dr
      }
      // return the average of torso and lowest dr
      return Math.ceil((lowestDR + torsoDR) / 2)
    }

    return this._defender.hitLocationsWithDR.filter(it => it.where === this._hitLocation).map(it => it.dr)[0]
  }

  get effects() {
    // TODO accumulate effects
    // each call to _calculator.effects returns an array of effects
    // create a flattened array of effects
    let effects = []
    this._calculators.map(calculator => calculator.effects).forEach(effect => effects.push(effect))
    effects = effects.flat()

    let results = []

    // process shock -- shock is the sum of all shock to the maximum of 4
    let shock = effects
      .filter(it => it.type === 'shock')
      .map(it => it.amount)
      .reduce((acc, value, index, array) => {
        return acc + value
      }, 0)

    if (shock > 0) {
      results.push({
        type: 'shock',
        amount: Math.min(shock, 4),
      })
    }

    // process knockback -- value and modifier is the sum across all hits
    let allKnockbacks = effects.filter(it => it.type === 'knockback')

    let knockbackValue = allKnockbacks
      .map(it => it.amount)
      .reduce((acc, value, index, array) => {
        return acc + value
      }, 0)

    let knockbackMods = allKnockbacks
      .map(it => it.modifier)
      .reduce((acc, value, index, array) => {
        return acc + value
      }, 0)

    if (allKnockbacks.length > 0) {
      results.push({
        type: 'knockback',
        amount: knockbackValue,
        modifier: knockbackMods,
      })
    }

    // process crippling -- just keep one of them
    let crippling = effects.find(it => it.type === 'crippling')
    if (!!crippling) results.push(crippling)

    // process major wound -- just keep one of them
    let majorwound = effects.find(it => it.type === 'majorwound')
    if (!!majorwound) results.push(majorwound)

    // process headvitalshit -- just keep one of them
    let headvitalshit = effects.find(it => it.type === 'headvitalshit')
    if (!!headvitalshit) results.push(headvitalshit)

    return results
  }

  get effectiveArmorDivisor() {
    // Armor Divisors do not apply to Explosions, (B414)
    if (this._isExplosion) return 1

    if ((this._armorDivisor > 1 || this._armorDivisor === -1) && this._isHardenedDR) {
      let maxIndex = armorDivisorSteps.length - 1
      let index = armorDivisorSteps.indexOf(this._armorDivisor)
      index = Math.min(index + this._hardenedDRLevel, maxIndex)
      return armorDivisorSteps[index]
    }
    return this._armorDivisor
  }

  get effectiveBluntTrauma() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].effectiveBluntTrauma
  }

  get effectiveDamage() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].effectiveDamage
  }

  // figure out the current DR modified by armor divisor, if necessary
  get effectiveDR() {
    let dr = this.DR

    if (this._isShotgun && this._shotgunRofMultiplier > 1) {
      dr = dr * this.shotgunDamageMultiplier
    }

    if (this._useArmorDivisor && !!this._armorDivisor) {
      // -1 divisor means "Ignore DR"
      let armorDivisor = this.effectiveArmorDivisor
      if (armorDivisor === -1) return 0
      if (armorDivisor < 1 && dr === 0) return 1

      return Math.floor(dr / armorDivisor)
    }
    return dr
  }

  get effectiveVulnerabilityMultiple() {
    return this._isVulnerable ? this._vulnerabilityMultiple : 1
  }

  get effectiveWoundModifiers() {
    let table = this.defaultWoundModifiers

    if (this._useLocationModifiers) {
      switch (this._hitLocation) {
        case 'Vitals':
          table = this._vitalsWoundModifiers
          break

        case 'Skull':
        case 'Eye':
          table = this._skullEyeWoundModifiers
          break

        case 'Face':
          table = this._faceWoundModifiers
          break

        case 'Neck':
          table = this._neckWoundModifiers
          break

        default: {
          if ([hitlocation.EXTREMITY, hitlocation.LIMB].includes(this.hitLocationRole))
            table = this._extremityWoundModifiers
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

  get explosionDivisor() {
    if (this._isExplosion) {
      return this._hexesFromExplosion * 3
    }
    return 1
  }

  get FP() {
    return this._defender.data.data.FP
  }

  get hardenedDRLevel() {
    return this._hardenedDRLevel
  }

  set hardenedDRLevel(value) {
    this._hardenedDRLevel = value
  }

  get hasAdditionalWoundingModifiers() {
    return this.additionalWoundModifier > 0 || this.effectiveVulnerabilityMultiple > 0
  }

  get hexesFromExplosion() {
    return this._hexesFromExplosion
  }

  set hexesFromExplosion(value) {
    this._hexesFromExplosion = value
  }

  get hitLocation() {
    return this._hitLocation
  }

  set hitLocation(text) {
    this._hitLocation = text
  }

  get hitLocationRole() {
    let hitLocation = this._defender._hitLocationRolls[this._hitLocation]
    if (!!hitLocation?.role) {
      return hitLocation.role
    }
    return null
  }

  /**
   * HitLocationsWithDR is an array of...
   * {
   *   where: 'Torso',
   *   dr: 5,
   *   roll: [9,10,11],
   *   rollText: '9-11',
   * }
   */
  get hitLocationsWithDR() {
    // internationalize English hit location name
    let locations = this._defender.hitLocationsWithDR
    return locations
  }

  get HP() {
    return this._defender.data.data.HP
  }

  get injury() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].injury
  }

  get injuryToleranceType() {
    return this._injuryToleranceType
  }

  set injuryToleranceType(value) {
    this._injuryToleranceType = value
  }

  get useDamageReduction() {
    return this._useDamageReduction
  }

  set useDamageReduction(value) {
    this._damageReductionLevel = value ? 2 : null
    this._useDamageReduction = value
  }

  get damageReductionLevel() {
    return this._damageReductionLevel
  }

  set damageReductionLevel(value) {
    if (value === null) this._useDamageReduction = false
    if (!!value && value < 2) value = 2
    this._damageReductionLevel = value
  }

  get isCrippleableLocation() {
    return [hitlocation.EXTREMITY, hitlocation.LIMB].includes(this.hitLocationRole) || this._hitLocation === 'Eye'
  }

  get isBluntTraumaInjury() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].isBluntTraumaInjury
  }

  get isExplosion() {
    return this._isExplosion
  }

  set isExplosion(value) {
    if (value && !this._isExplosion) {
      this._previousHitLocation = this._hitLocation
      this._hitLocation = 'Large-Area'
    } else if (!value && this._isExplosion) {
      this._hitLocation = this._previousHitLocation
    }
    this._isExplosion = value
  }

  get isFlexibleArmor() {
    return this._isFlexibleArmor
  }

  set isFlexibleArmor(value) {
    this._isFlexibleArmor = value
  }

  get isHardenedDR() {
    return this._isHardenedDR
  }

  set isHardenedDR(value) {
    this._isHardenedDR = value
  }

  get isInjuryReducedByLocation() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].isInjuryReducedByLocation
  }

  get isInjuryTolerance() {
    return this._isInjuryTolerance
  }

  set isInjuryTolerance(value) {
    this._isInjuryTolerance = value
  }

  get isRangedHalfDamage() {
    return this._isRangedHalfDamage
  }

  set isRangedHalfDamage(value) {
    this._isRangedHalfDamage = value
    if (value) {
      this._isShotgun = false
    }
  }

  get isShotgun() {
    return this._isShotgun
  }

  set isShotgun(value) {
    this._isShotgun = value
    if (value) {
      this._isRangedHalfDamage = false
    }
  }

  get shotgunRofMultiplier() {
    return this._shotgunRofMultiplier
  }

  set shotgunRofMultiplier(value) {
    this._shotgunRofMultiplier = value
  }

  get isVulnerable() {
    return this._isVulnerable
  }

  set isVulnerable(value) {
    this._isVulnerable = value
  }

  get isWoundModifierAdjustedForInjuryTolerance() {
    let table = this.effectiveWoundModifiers
    let entries = Object.keys(table).filter(key => table[key].changed === 'injury-tolerance')
    return entries.length > 0
  }

  get isWoundModifierAdjustedForLocation() {
    let table = this.effectiveWoundModifiers
    let entries = Object.keys(table).filter(key => table[key].changed === 'hitlocation')
    return entries.length > 0
  }

  get length() {
    return this._calculators.length
  }

  get locationMaxHP() {
    if (this.hitLocationRole === hitlocation.LIMB) return this.HP.max / 2 + 1
    if (this.hitLocationRole === hitlocation.EXTREMITY) return this.HP.max / 3 + 1
    if (this.hitLocation === 'Eye') return this.HP.max / 10 + 1
    return this.HP.max
  }

  get locationMaxHPAsInt() {
    return Math.floor(this.locationMaxHP)
  }

  get maxInjuryForDiffuse() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].maxInjuryForDiffuse
  }

  get penetratingDamage() {
    if (this._viewId === 'all') return
    return this._calculators[this._viewId].penetratingDamage
  }

  get pointsToApply() {
    return this._calculators.map(it => it.pointsToApply).reduce((acc, value) => acc + value)
  }

  get resource() {
    if (CompositeDamageCalculator.isResourceDamageType(this._applyTo)) {
      let trackers = objectToArray(this._defender.data.data.additionalresources.tracker)
      let tracker = null
      let index = null
      trackers.forEach((t, i) => {
        if (t.alias === this._applyTo) {
          index = i
          tracker = t
          return
        }
      })
      return [tracker, `data.additionalresources.tracker.${index}`]
    }

    if (this._applyTo === 'fat') return [this._defender.data.data.FP, 'data.FP']
    return [this._defender.data.data.HP, 'data.HP']
  }

  get resourceType() {
    if (CompositeDamageCalculator.isResourceDamageType(this._applyTo)) {
      let trackers = objectToArray(this._defender.data.data.additionalresources.tracker)
      return trackers.find(it => it.alias === this._applyTo).name
    }

    if (this._applyTo === 'fat') return 'FP'
    return 'HP'
  }

  get shotgunDamageMultiplier() {
    if (this._isShotgun && this._shotgunRofMultiplier > 1) {
      return Math.floor(this._shotgunRofMultiplier / 2)
    }
    return 1
  }

  get totalBasicDamage() {
    return this._calculators.map(it => it.basicDamage).reduce((acc, value) => acc + value)
  }

  get totalWoundingModifier() {
    return (this.woundingModifier + this._additionalWoundModifier) * this.effectiveVulnerabilityMultiple
  }

  get useArmorDivisor() {
    return this._useArmorDivisor
  }

  set useArmorDivisor(value) {
    this._useArmorDivisor = value
  }

  get useBluntTrauma() {
    return this._useBluntTrauma
  }

  set useBluntTrauma(value) {
    this._useBluntTrauma = value
  }

  get useLocationModifiers() {
    return this._useLocationModifiers
  }

  set useLocationModifiers(value) {
    this._useLocationModifiers = value
  }

  get userEnteredDR() {
    return this._userEnteredDR
  }

  set userEnteredDR(value) {
    this._userEnteredDR = value
  }

  get userEnteredWoundModifier() {
    return this._userEnteredWoundModifier
  }

  set userEnteredWoundModifier(value) {
    this._userEnteredWoundModifier = value
  }

  get viewId() {
    return this._viewId
  }

  set viewId(value) {
    this._viewId = value
  }

  get vulnerabilityMultiple() {
    return this._vulnerabilityMultiple
  }

  set vulnerabilityMultiple(value) {
    this._vulnerabilityMultiple = value
  }

  get woundingModifier() {
    if (this._damageType === 'none') return 1
    if (this._damageType === 'User Entered') return this._userEnteredWoundModifier

    return this.effectiveWoundModifiers[this._damageType].multiplier
  }

  get _extremityWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter(key => ['imp', 'pi+', 'pi++'].includes(key))
      .forEach(key => {
        results[key].multiplier = 1
        results[key].changed = 'hitlocation'
      })
    return results
  }

  get _faceWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    results['cor'].multiplier = 1.5
    results['cor'].changed = 'hitlocation'
    return results
  }

  get _neckWoundModifiers() {
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

  get _skullEyeWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter(key => key !== 'tox') // everything EXCEPT toxic
      .forEach(key => {
        results[key].multiplier = 4
        results[key].changed = 'hitlocation'
      })
    return results
  }

  get _vitalsWoundModifiers() {
    // copy the properties into my local variable
    let results = JSON.parse(JSON.stringify(this.defaultWoundModifiers))

    // update the ones that need it
    Object.keys(results)
      .filter(key => ['imp', ...piercing].includes(key))
      .forEach(key => {
        results[key].multiplier = 3
        results[key].changed = 'hitlocation'
      })
    return results
  }

  _modifyForInjuryTolerance(result, value) {
    let m = Math.min(result.multiplier, value)

    if (m <= result.multiplier) {
      result.multiplier = m
      result.changed = 'injury-tolerance'
    }
  }

  randomizeHitLocation() {
    let roll3d = Roll.create('3d6')
    roll3d.roll()
    let total = roll3d.total

    let loc = this._defender.hitLocationsWithDR.filter(it => it.roll.includes(total))
    if (!!loc && loc.length > 0) this._hitLocation = loc[0].where
    else ui.notifications.warn(`There are no hit locations defined for #${total}`)
    return roll3d
  }
}

class DamageCalculator {
  /**
   *
   * @param {CompositeDamageCalculator} parent
   * @param {*} damageData
   */
  constructor(parent, damageData) {
    this._parent = parent
    this._basicDamage = damageData.damage
    this._maxInjuryForDiffuse = null
    this._bluntTrauma = null
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
    if (this._parent.isRangedHalfDamage) {
      return Math.floor(this._basicDamage / 2)
    } else if (this._parent.isShotgun) {
      return this._basicDamage * this._parent.shotgunDamageMultiplier
    } else {
      return this._basicDamage
    }
  }

  get penetratingDamage() {
    return Math.max(0, this.effectiveDamage - this._parent.effectiveDR)
  }

  /**
   * Injury is equal to penetrating damage x total wounding modifiers.
   */
  get injury() {
    this._maxInjuryForDiffuse = null
    let injury = Math.floor(
      (this.penetratingDamage * this._parent.totalWoundingModifier) / this._parent.explosionDivisor
    )

    if (this._parent._damageReductionLevel !== null && this._parent._damageReductionLevel != 0) {
      // Injury Tolerance (Damage Reduction) can't reduce damage below 1
      injury = Math.max(1, Math.floor(injury / this._parent._damageReductionLevel))
    }

    // B380: A target with Injury Tolerance (Diffuse) is even harder to damage!
    if (this._parent.isInjuryTolerance && this._parent.injuryToleranceType === DIFFUSE) {
      // ...Impaling and piercing attacks (of any size) never do more than 1 HP of injury,
      // regardless of penetrating damage!
      if (['imp', ...piercing].includes(this._parent.damageType)) {
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
    if (!bluntTraumaTypes.includes(this._parent.damageType)) return 0
    if (this._parent.damageType === 'cr') return Math.floor(this.effectiveDamage / 5)
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
      injury === 0
        ? this._parent.isFlexibleArmor && this._parent.useBluntTrauma
          ? this.effectiveBluntTrauma
          : 0
        : injury
    return pointsToApply
  }

  /**
   * Actual number of HP to apply is the amount of injury, or the effective blunt trauma.
   * Set a limit of the max needed to cripple the location.
   */
  get pointsToApply() {
    let pointsToApply = this.unmodifiedPointsToApply
    if (this._parent.useLocationModifiers) {
      if ([hitlocation.EXTREMITY, hitlocation.LIMB].includes(this._parent.hitLocationRole)) {
        return Math.min(pointsToApply, Math.floor(this._parent.locationMaxHP))
      }
    }
    return pointsToApply
  }

  get bonusToHTRollForHalfDamage() {
    return this._parent.isRangedHalfDamage ? 3 : 0
  }

  get calculatedShock() {
    let factor = Math.max(1, Math.floor(this._parent.HP.max / 10))
    let shock = Math.min(4, Math.floor(this.pointsToApply / factor))
    return shock
  }

  get isMajorWound() {
    return this.pointsToApply > this._parent.HP.max / 2
  }

  get penaltyToHTRollForStunning() {
    // Diffuse or Homogenous: Ignore all knockdown modifiers for hit location.
    let isInjuryTolerance = this._parent.isInjuryTolerance
    let injuryToleranceType = this._parent.injuryToleranceType
    if (isInjuryTolerance && (injuryToleranceType === DIFFUSE || injuryToleranceType === HOMOGENOUS)) {
      return 0
    }

    if (['Face', 'Vitals', 'Groin'].includes(this._parent.hitLocation)) return 5

    // No Brain (Diffuse or Homogenous) - blows to skull or eye are no different than a blow to
    // the face, except that eyes can still be crippled. (Handled earlier in this method.)
    if (this.isMajorWound && ['Eye', 'Skull', 'Brain'].includes(this._parent.hitLocation)) return 10

    return 0
  }

  get isCripplingInjury() {
    if (this._parent.useLocationModifiers && this._parent.isCrippleableLocation) {
      return this.unmodifiedPointsToApply > this._parent.locationMaxHP
    }
    return false
  }

  get isInjuryReducedByLocation() {
    return this._parent.useLocationModifiers && this.isCripplingInjury && this._parent.hitLocation !== 'Eye'
  }

  get isKnockbackEligible() {
    if (this._parent.damageType === 'cr' && this._basicDamage > 0) return true

    return this._parent.damageType === 'cut' && this._basicDamage > 0 && this.penetratingDamage === 0
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
      if ([...head, 'Vitals'].includes(this._parent.hitLocation) && shock > 0) {
        _effects.push({
          type: 'headvitalshit',
          detail: this._parent.hitLocation,
          modifier: this.penaltyToHTRollForStunning - this.bonusToHTRollForHalfDamage,
        })
      } else if (this.isMajorWound) {
        isMajorWound = true
        _effects.push({
          type: 'majorwound',
          modifier: this.penaltyToHTRollForStunning - this.bonusToHTRollForHalfDamage,
        })
      }

      // Crippling Injury is also a Major Wound
      if (this.isCripplingInjury) {
        _effects.push({
          type: 'crippling',
          amount: Math.floor(this._parent.locationMaxHP),
          detail: this._parent.hitLocation,
          reduceInjury: this.isInjuryReducedByLocation,
        })
        if (!isMajorWound)
          _effects.push({
            type: 'majorwound',
            modifier: this.penaltyToHTRollForStunning - this.bonusToHTRollForHalfDamage,
          })
      }
    }

    if (this.isKnockbackEligible) {
      let knockback = Math.floor(this._basicDamage / (this._parent.attributes.ST.value - 2))
      if (knockback > 0) {
        let modifier = knockback - 1
        _effects.push({
          type: 'knockback',
          amount: knockback,
          modifier: modifier,
        })
      }
    }

    return _effects
  }

  get basicDamage() {
    return this._basicDamage
  }

  set basicDamage(value) {
    this._basicDamage = value
  }

  get bluntTrauma() {
    return this._bluntTrauma
  }

  set bluntTrauma(value) {
    this._bluntTrauma = value
  }

  get isBluntTraumaInjury() {
    return (
      this.injury === 0 && this._parent.isFlexibleArmor && this._parent.useBluntTrauma && this.effectiveBluntTrauma > 0
    )
  }

  get maxInjuryForDiffuse() {
    return this._maxInjuryForDiffuse
  }
}
