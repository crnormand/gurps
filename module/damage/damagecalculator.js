'use strict'

import * as settings from '../../lib/miscellaneous-settings.js'
import * as hitlocation from '../hitlocation/hitlocation.js'
import { i18n, objectToArray, zeroFill } from '../../lib/utilities.js'
import { HitLocationEntry } from '../actor/actor-components.js'

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
const UNLIVING = 'unliving'

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
   * @param {DamageData[]} damageData
   */
  constructor(defender, damageData) {
    this._useBluntTrauma = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BLUNT_TRAUMA)
    this._useLocationModifiers = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_LOCATION_MODIFIERS)
    this._useArmorDivisor = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_APPLY_DIVISOR)
    this._useBodyHits = game.settings.get(settings.SYSTEM_NAME, settings.SETTING_BODY_HITS)

    this._defender = defender

    // The CompositeDamageCalculator has multiple DamageCalculators -- create one per DamageData
    // and give it a back pointer to the Composite.
    this._calculators = damageData.map(data => new DamageCalculator(this, data))

    this.viewId = this._calculators.length == 1 ? 0 : 'all'

    this._defaultWoundingModifiers = Object.keys(GURPS.DamageTables.woundModifiers).reduce(function (r, e) {
      if (!GURPS.DamageTables.woundModifiers[e].nodisplay) r[e] = GURPS.DamageTables.woundModifiers[e]
      return r
    }, {})

    this._attacker = damageData[0].attacker

    if (Object.keys(this._defaultWoundingModifiers).includes(damageData[0].damageType))
      this._damageType = damageData[0].damageType
    else {
      let temp = GURPS.DamageTables.translate(damageData[0].damageType)
      if (temp) this._damageType = temp
      else this._damageType = 'none'
    }

    if (!!CompositeDamageCalculator.isResourceDamageType(this._damageType)) {
      this._applyTo = this._damageType
    } else {
      this._applyTo = this._damageType === 'fat' ? 'FP' : 'HP'
    }

    this._damageModifier = damageData[0].damageModifier

    this._armorDivisor = damageData[0].armorDivisor
    if (this._armorDivisor === 0) {
      this._useArmorDivisor = false
    }

    this._hitLocationAdjusted = false

    let hitlocations = objectToArray(this._defender.system.hitlocations)
    let wheres = hitlocations.map(it => it.where.toLowerCase())
    let damageLocation = !!damageData[0].hitlocation ? damageData[0].hitlocation.toLowerCase() : ''
    let hlIndex = wheres.indexOf(damageLocation)
    if (hlIndex >= 0) this._hitLocation = hitlocations[hlIndex].where
    else this._hitLocation = this._defender.defaultHitLocation

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

    // look at defender and automatically set things like Unliving, Diffuse, Homogenous
    // if advantage.name === 'Diffuse' -- DFRPG style
    // if advantage.name === 'Injury Tolerance' && advantage.notes.startsWith('Diffuse ') -- GCS Basic style
    //    _isInjuryTolerance = true
    //    _injuryToleranceType = 'unliving'
    let values = Object.values(this._defender.system.ads)
    if (this.isUnliving(values, false)) {
      this._isInjuryTolerance = true
      this._injuryToleranceType = UNLIVING
    }
    if (this.isHomogenous(values)) {
      this._isInjuryTolerance = true
      this._injuryToleranceType = HOMOGENOUS
    }
    if (this.isDiffuse(values)) {
      this._isInjuryTolerance = true
      this._injuryToleranceType = DIFFUSE
    }
  }

  isUnliving(values, found) {
    if (!found) {
      let self = this
      found = values.find(value => {
        let found = !!(
          ['Injury Tolerance (Unliving)', 'Unliving'].includes(value.name) ||
          (value.name === 'Injury Tolerance' && value.notes.includes('Unliving'))
        )
        const contents = value.contains ?? value.collapsed
        if (!found && Object.keys(contents).length > 0) {
          found = self.isUnliving(Object.values(contents), false)
        }
        return found
      })
    }
    return !!found
  }

  isHomogenous(values, found) {
    if (!found) {
      let self = this
      found = values.find(value => {
        let found = !!(
          ['Injury Tolerance (Homogenous)', 'Homogenous'].includes(value.name) ||
          (value.name === 'Injury Tolerance' && value.notes.includes('Homogenous'))
        )

        const contents = value.contains ?? value.collapsed
        if (!found && Object.keys(contents).length > 0) {
          found = self.isHomogenous(Object.values(contents), false)
        }
        return found
      })
    }
    return !!found
  }

  isDiffuse(values, found) {
    if (!found) {
      let self = this
      found = values.find(value => {
        let found = !!(
          ['Injury Tolerance (Diffuse)', 'Diffuse'].includes(value.name) ||
          (value.name === 'Injury Tolerance' && value.notes.includes('Diffuse'))
        )

        const contents = value.contains ?? value.collapsed
        if (!found && Object.keys(contents).length > 0) {
          found = self.isDiffuse(Object.values(contents), false)
        }
        return found
      })
    }
    return !!found
  }

  static isResourceDamageType(damageType) {
    let modifier = GURPS.DamageTables.woundModifiers[damageType]
    return !!modifier && !!GURPS.DamageTables.woundModifiers[damageType].resource
  }

  get(viewId) {
    if (viewId === 'all') return this
    return this._calculators[viewId]
  }

  get showApplyAction() {
    return (
      game.settings.get(settings.SYSTEM_NAME, settings.SETTING_DEFAULT_ADD_ACTION) == 'apply' ||
      (game.settings.get(settings.SYSTEM_NAME, settings.SETTING_DEFAULT_ADD_ACTION) == 'target' &&
        this._defender.hasPlayerOwner)
    )
  }

  get additionalWoundModifier() {
    return this._additionalWoundModifier
  }

  set additionalWoundModifier(value) {
    this._additionalWoundModifier = value
  }

  get allHitLocations() {
    return this._defender.system.hitlocations
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
    return this._defender.system.attributes
  }

  /**
   * Override at the individual dice roll level.
   */
  get basicDamage() {
    if (this._viewId === 'all') return this._calculators.reduce((sum, a) => sum + a._basicDamage, 0)
    return this._calculators[this._viewId].basicDamage
  }

  set basicDamage(value) {
    if (this._viewId === 'all') return
    this._calculators[this._viewId].basicDamage = value
  }

  get calculators() {
    return this._calculators
  }

  get damageModifier() {
    return this._damageModifier
  }

  set damageModifier(value) {
    this._damageModifier = value
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
    let entries = this._defender.hitLocationsWithDR

    if (this._hitLocation === 'Large-Area') return HitLocationEntry.getLargeAreaDR(entries)

    let hitlocation = HitLocationEntry.findLocation(entries, this._hitLocation)

    // This condition happens because the actor sheet doesn't have a hit location named "Torso". He might have a hit
    // location localized to his language, like "Tronco" in Portuguese. Do a last ditch effort to find the hit location
    // using the localized name.
    if (!hitlocation) {
      const alternative = i18n(`GURPS.hitLocation${this._hitLocation}`)
      hitlocation = HitLocationEntry.findLocation(entries, alternative)
    }

    return hitlocation.getDR(this.damageType)
    // return this._hitLocation === 'Large-Area'
    //   ? HitLocationEntry.getLargeAreaDR(entries)
    //   : HitLocationEntry.findLocation(entries, this._hitLocation).getDR(this.damageType)
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
        unit: knockbackValue === 1 ? i18n('GURPS.yard') : i18n('GURPS.yards'),
        modifierText: !!knockbackMods ? `–${knockbackMods}` : '',
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
      let _divisor = this._armorDivisor == 4 ? 3 : this._armorDivisor //If you're using survivable guns check if it's (4) because it's not part of the regular progression, thus we treat it as 3.
      let maxIndex = armorDivisorSteps.length - 1
      let index = armorDivisorSteps.indexOf(_divisor)
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
          // only imp, pi*, and burn tbb can target Vitals
          table = this._vitalsWoundModifiers
          break

        case 'Skull':
        case 'Eye':
          // only inp, pi*, and burn tbb can target Eye
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
        case UNLIVING:
          // if Eye, Skull, or Vitals, don't modify wounding modifier
          if (['Eye', 'Skull', 'Vitals'].includes(this._hitLocation)) break

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
    return this._defender.system.FP
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
    let locations = this._defender.hitLocationsWithDR
    for (let l of locations) l.damageType = this.damageType
    return locations
  }

  get HP() {
    return this._defender.system.HP
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
    return (
      [hitlocation.EXTREMITY, hitlocation.LIMB, hitlocation.CHEST, hitlocation.GROIN].includes(this.hitLocationRole) ||
      this._hitLocation === 'Eye'
    )
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

      // Explosion is mutually exclusive with Ranged 1/2D and Shotgun ... ?
      this._isShotgun = false
      this._isRangedHalfDamage = false
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
      this._isExplosion = false
    }
  }

  get isShotgun() {
    return this._isShotgun
  }

  set isShotgun(value) {
    this._isShotgun = value
    if (value) {
      this._isRangedHalfDamage = false
      this._isExplosion = false
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

  get isWoundModifierAdjustedForDamageType() {
    let table = this.effectiveWoundModifiers
    let entries = Object.keys(table).filter(key => table[key].changed === 'damagemodifier')
    return entries.length > 0
  }

  get length() {
    return this._calculators.length
  }

  get cripplingThreshold() {
    if (this.hitLocationRole === hitlocation.LIMB) return this.HP.max / 2
    if (this.hitLocationRole === hitlocation.EXTREMITY) return this.HP.max / 3
    if (this._useBodyHits) {
      if (this.hitLocationRole === hitlocation.CHEST) return this.HP.max * 2
      if (this.hitLocationRole === hitlocation.GROIN) return this.HP.max * 2
    } else {
      if (this.hitLocationRole === hitlocation.CHEST) return Infinity
      if (this.hitLocationRole === hitlocation.GROIN) return Infinity
    }
    if (this.hitLocation === 'Eye') return this.HP.max / 10
    return Infinity
  }

  get locationMaxHP() {
    const adjustHp = [hitlocation.EXTREMITY, hitlocation.LIMB].includes(this.hitLocationRole) ? 1 : 0
    return this.isCrippleableLocation ? this.cripplingThreshold + adjustHp : Infinity
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
    // if (CompositeDamageCalculator.isResourceDamageType(this._applyTo)) {
    let trackers = objectToArray(this._defender.system.additionalresources.tracker)
    let tracker = null
    let index = null
    trackers.forEach((t, i) => {
      if (t.alias === this._applyTo) {
        index = i
        tracker = t
        return
      }
    })
    if (!!tracker) return [tracker, `system.additionalresources.tracker.${zeroFill(index, 4)}`]
    // }

    if (this._applyTo === 'FP') return [this._defender.system.FP, 'system.FP']
    return [this._defender.system.HP, 'system.HP']
  }

  get resourceType() {
    // if (CompositeDamageCalculator.isResourceDamageType(this._applyTo)) {
    let trackers = objectToArray(this._defender.system.additionalresources.tracker)
    let tracker = trackers.find(it => it.alias === this._applyTo)
    if (!!tracker) return tracker.name
    // }

    if (this._applyTo === 'FP') return 'FP'
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

    // update for [burn tbb]
    if (this._isTightBeamBurning) {
      results['burn'].multiplier = 2
      results['burn'].changed = 'damagemodifier'
    }

    return results
  }

  get _isTightBeamBurning() {
    return this._damageType === 'burn' && this._damageModifier === 'tbb'
  }

  _modifyForInjuryTolerance(result, value) {
    let m = Math.min(result.multiplier, value)

    if (m <= result.multiplier) {
      result.multiplier = m
      result.changed = 'injury-tolerance'
    }
  }

  async randomizeHitLocation() {
    const hitLocationRoll = Roll.create('3d6[Hit Location]')

    await hitLocationRoll.evaluate()
    const total = hitLocationRoll.total

    const loc = this._defender.hitLocationsWithDR.filter(it => it.roll.includes(total))

    if (loc?.length > 0) this._hitLocation = loc[0].where
    else ui.notifications.warn(`There are no hit locations defined for #${total}`)

    return hitLocationRoll
  }

  async adjustHitLocationIfNecessary() {
    if (this._hitLocationAdjusted) return undefined

    this._hitLocationAdjusted = true

    // If this._hitLocation === 'Torso' and we are using body hits from High Tech p163, then we need to see if the
    // Vitals were hit.
    if (
      this._useBodyHits &&
      ([...piercing, 'imp'].includes(this.damageType) || this._isTightBeamBurning) &&
      this._hitLocation === 'Torso'
    ) {
      const vitalsRoll = Roll.create('1d6[Vitals]')
      await vitalsRoll.evaluate()

      const total = vitalsRoll.total
      if (total === 1) this._hitLocation = 'Vitals'

      return vitalsRoll
    }
    return undefined
  }
}

/**
 * An individual DamageCalculator is responsible for calculating the damage and effects for a single
 * damage roll.
 */
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
    } else if (this._parent.isExplosion) {
      return Math.floor(this._basicDamage / this._parent.explosionDivisor)
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
    let injury = Math.floor(this.penetratingDamage * this._parent.totalWoundingModifier)

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
   * Set a limit of the max needed to cripple the location. markline
   */
  get pointsToApply() {
    let pointsToApply = this.unmodifiedPointsToApply
    if (this._parent.useLocationModifiers) {
      if ([hitlocation.EXTREMITY, hitlocation.LIMB].includes(this._parent.hitLocationRole)) {
        return Math.min(pointsToApply, Math.floor(this._parent.locationMaxHP))
      } else if (
        [hitlocation.GROIN, hitlocation.CHEST].includes(this._parent.hitLocationRole) &&
        this._parent._useBodyHits &&
        (['imp', ...piercing].includes(this._parent.damageType) || this._isTightBeamBurning)
      ) {
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

    // B420 "Knockdown and Stunning" states that HT-5 is a modifier for Major Wound on Face/Vitals/Groin
    // B399 says "damage rolls at HT-5" but that's just a simplified summary on could happen, should follow B420
    if (this.isMajorWound && ['Face', 'Vitals', 'Groin'].includes(this._parent.hitLocation)) return 5

    // No Brain (Diffuse or Homogenous) - blows to skull or eye are no different than a blow to
    // the face, except that eyes can still be crippled. (Handled earlier in this method.)
    if (this.isMajorWound && ['Eye', 'Skull', 'Brain'].includes(this._parent.hitLocation)) return 10

    return 0
  }

  get isCripplingInjury() {
    if (this._parent.useLocationModifiers && this._parent.isCrippleableLocation) {
      return this.unmodifiedPointsToApply > this._parent.cripplingThreshold
    }
    return false
  }

  get isInjuryReducedByLocation() {
    return this._parent.useLocationModifiers && this.isCripplingInjury && this._parent.hitLocation !== 'Eye'
  }

  get isKnockbackEligible() {
    // Damage modifier 'nkb' means no knockback
    if (this._parent._damageModifier === 'nkb') return false

    if ((this._parent.damageType === 'cr' || this._parent.damageType === 'kb') && this._basicDamage > 0) return true

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
      let st = this._parent.attributes.ST.value
      let hp = this._parent._defender.system.HP.max

      // if the target has no ST score, use its HPs instead (B378)
      let knockbackResistance = !st || st == 0 ? hp - 2 : st - 2
      // if ST or HP is less than 3, knockback is one yard per point of damage (B378)
      knockbackResistance = Math.max(knockbackResistance, 1)
      // For every full multiple of the target’s ST-2 rolled, move the target one yard away from the attacker. (B378)
      let knockback = Math.floor(this.effectiveDamage / knockbackResistance)

      // TODO this is the default behavior; implement Powers P101 (in which knockback is calculated based on double basic damage)
      // This lets a crushing or cutting attack inflict twice as much knockback as usual. (B104)
      if (this._parent._damageModifier === 'dkb') knockback *= 2

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
