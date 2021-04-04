'use strict'

import { extractP, convertRollStringToArrayOfInt } from '../../lib/utilities.js'

export const LIMB = 'limb'
export const EXTREMITY = 'extremity'

// This table is used to display dice rolls and penalties (if they are missing from the import
// data) and to create the HitLocations pulldown menu (skipping any "skip:true" entries).
//
// Use the 'RAW' property to provide the Rules-As-Written hit location name, which is used in the
// per-bodyplan hit location tables, below.
//
// Some entries combine two (or more?) related locations, such as left and right limbs. They will
// have a 'roll' property that uses the ampersand (&) character. Those locations must also include
// a 'prefix' property that will be used when splitting out the combined values into single values.
export var hitlocationRolls = null

export var hitlocationDictionary = null

export class HitLocation {
  static VITALS = 'Vitals'
  static HUMANOID = 'humanoid'
  static SKULL = 'Skull'
  static BRAIN = 'Brain'
  static DEFAULT = '-'

  constructor(loc = '', dr = '0', penalty = '', roll = HitLocation.DEFAULT, equipment = '') {
    this.where = loc
    this.dr = dr
    this.equipment = equipment
    this.penalty = penalty
    this.roll = roll
    return this
  }

  static init() {
    // README: The keys in this object literal (Eye, Eyes, Skull, etc...) are directly used in
    // README: the language files for i18n, with the prefix 'GURPS.hitLocation' (example:
    // README: 'GURPS.hitLocationEyes'). DO NOT EDIT the keys here, but instead update them in
    // README: the langauge file.
    //
    // README: I'm also updating the desc property to be an array of i18n keys.
    hitlocationRolls = {
      Eye: { roll: '-', penalty: -9, skip: true },
      Eyes: { roll: '-', penalty: -9 }, // GCA
      Skull: { roll: '3-4', penalty: -7 },
      'Skull, from behind': { penalty: -5 },
      Face: { roll: '5', penalty: -5 },
      'Face, from behind': { penalty: -7 },
      Nose: { penalty: -7, desc: ['GURPS.hitLocationDescFront', 'GURPS.hitLocationDescChest'] },
      Jaw: { penalty: -6, desc: ['GURPS.hitLocationDescFront', 'GURPS.hitLocationDescChest'] },
      'Neck Vein/Artery': { penalty: -8, desc: ['GURPS.hitLocationDescNeck'] },
      'Limb Vein/Artery': { penalty: -5, desc: ['GURPS.hitLocationDescLimb'] },
      'Right Leg': { roll: '6-7', penalty: -2, skip: true },
      'Right Arm': { roll: '8', penalty: -2, skip: true },
      'Right Arm, holding shield': { penalty: -4, skip: true },
      'Arm, holding shield': { penalty: -4 },
      Arm: { roll: '8 & 12', penalty: -2 }, // GCA
      Arms: { roll: '8 & 12', penalty: -2, skip: true }, // GCA
      Torso: { roll: '9-10', penalty: 0 },
      Vitals: { roll: '-', penalty: -3, desc: ['GURPS.hitLocationDescImp'] },
      'Vitals, Heart': { penalty: -5, desc: ['GURPS.hitLocationDescImp'] },
      Groin: { roll: '11', penalty: -3 },
      'Left Arm': { roll: '12', penalty: -2, skip: true },
      'Left Arm, holding shield': { penalty: -4, skip: true },
      'Left Leg': { roll: '13-14', penalty: -2, skip: true },
      Legs: { roll: '6-7&13-14', penalty: -2, skip: true }, // GCA
      Leg: { roll: '6-7&13-14', penalty: -2 }, // GCA
      Hand: { roll: '15', penalty: -4 },
      Hands: { roll: '15', penalty: -4, skip: true }, // GCA
      Foot: { roll: '16', penalty: -4 },
      Feet: { roll: '16', penalty: -4, skip: true }, // GCA
      Neck: { roll: '17-18', penalty: -5 },
      'Chinks in Torso': { penalty: -8, desc: ['GURPS.hitLocationDescHalfDR'] },
      'Chinks in Other': { penalty: -10, desc: ['GURPS.hitLocationDescHalfDR'] },
    }

    hitLocationAlias = {
      Eyes: { RAW: 'Eye' },
      Arm: { RAW: 'Arm', prefix: ['Right', 'Left'] },
      Arms: { RAW: 'Arm', prefix: ['Right', 'Left'] },
      Legs: { RAW: 'Leg', prefix: ['Right', 'Left'] },
      Leg: { RAW: 'Leg', prefix: ['Right', 'Left'] },
      Hands: { RAW: 'Hand' },
      Feet: { RAW: 'Foot' },
      Hindleg: { RAW: 'Hind Leg' },
      HindLegs: { RAW: 'Hind Leg' },
      ForeLegs: { RAW: 'Foreleg' },
      Midlegs: { RAW: 'Mid Leg' },
      Wings: { RAW: 'Wing' },
      ForeFeet: { RAW: 'Foot' },
      HindFeet: { RAW: 'Foot' },
      Fins: { RAW: 'Fin' },
    }

    humanoidHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      'Right Leg': { roll: '6-7', penalty: -2, role: LIMB },
      'Right Arm': { roll: '8', penalty: -2, role: LIMB },
      Torso: { roll: '9-10', penalty: 0 },
      Groin: { roll: '11', penalty: -3 },
      'Left Arm': { roll: '12', penalty: -2, role: LIMB },
      'Left Leg': { roll: '13-14', penalty: -2, role: LIMB },
      Hand: { roll: '15', penalty: -4, role: EXTREMITY },
      Foot: { roll: '16', penalty: -4, role: EXTREMITY },
      Neck: { roll: '17-18', penalty: -5 },
      Vitals: { roll: '-', penalty: -3 },
    }

    quadrupedHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Foreleg: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Groin: { roll: '12', penalty: -3 },
      'Hind Leg': { roll: '13-14', penalty: -2, role: LIMB },
      Foot: { roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    avianHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Wing: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Groin: { roll: '12', penalty: -3 },
      Leg: { roll: '13-14', penalty: -2, role: LIMB },
      Foot: { roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    centaurHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Neck: { roll: '5', penalty: -5 },
      Face: { roll: '6', penalty: -5 },
      Foreleg: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Groin: { roll: '12', penalty: -3 },
      'Hind Leg': { roll: '13-14', penalty: -2, role: LIMB },
      Arm: { roll: '15-16', penalty: -2, role: LIMB },
      Extremity: { roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    wingedQuadHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Foreleg: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Wing: { roll: '12', penalty: -2, role: LIMB },
      'Hind Leg': { roll: '13-14', penalty: -2, role: LIMB },
      Foot: { roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    hexapodHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Neck: { roll: '5', penalty: -5 },
      Face: { roll: '6', penalty: -5 },
      Foreleg: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-10', penalty: 0 },
      'Mid Leg': { roll: '11', penalty: -2, role: LIMB },
      Groin: { roll: '12', penalty: -3 },
      'Hind Leg': { roll: '13-14', penalty: -2, role: LIMB },
      Foot: { roll: '15-16', penalty: -4, role: EXTREMITY },
      'Mid Leg*': { roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { roll: '-', penalty: -3 },
    }

    wingedHexHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Neck: { roll: '5', penalty: -5 },
      Face: { roll: '6', penalty: -5 },
      Foreleg: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-10', penalty: 0 },
      'Mid Leg': { roll: '11', penalty: -2, role: LIMB },
      Wing: { roll: '12', penalty: -2, role: LIMB },
      'Hind Leg': { roll: '13-14', penalty: -2, role: LIMB },
      'Mid Leg*': { roll: '15-16', penalty: -2, role: LIMB },
      Foot: { roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    vermiformHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6-8', penalty: -5 },
      Torso: { roll: '9-18', penalty: 0 },
      Vitals: { roll: '-', penalty: -3 },
    }

    snakeManHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Arm: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-12', penalty: 0 },
      'Arm*': { roll: '13-14', penalty: -2, role: LIMB },
      'Torso*': { roll: '15-16', penalty: 0 },
      Hand: { roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    wingedSerpentHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6-8', penalty: -5 },
      Torso: { roll: '9-14', penalty: 0 },
      Wing: { roll: '15-18', penalty: -2, role: LIMB },
      Vitals: { roll: '-', penalty: -3 },
    }

    octopodHitLocations = {
      Eye: { roll: '-', penalty: -8 },
      Brain: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      'Arm 1-2': { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-12', penalty: 0 },
      'Arm 3-4': { roll: '13-14', penalty: -2, role: LIMB },
      'Arm 5-6': { roll: '15-16', penalty: -2, role: LIMB },
      'Arm 7-8': { roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { roll: '-', penalty: -3 },
    }

    squidHitLocations = {
      Eye: { roll: '-', penalty: -8 },
      Brain: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      'Arm 1-2': { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-12', penalty: 0 },
      Extremity: { roll: '13-16', penalty: -3, role: EXTREMITY },
      'Torso*': { roll: '17-18', penalty: -2 },
      Vitals: { roll: '-', penalty: -3 },
    }

    cancroidHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Arm: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-12', penalty: 0 },
      Leg: { roll: '13-16', penalty: -2, role: LIMB },
      Foot: { roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    scorpionHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Neck: { roll: '6', penalty: -5 },
      Arm: { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Tail: { roll: '12', penalty: -3, role: LIMB },
      Leg: { roll: '13-16', penalty: -2, role: LIMB },
      Foot: { roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    ichthyoidHitLocations = {
      Eye: { roll: '-', penalty: -8 },
      Skull: { roll: '3-4', penalty: -7 },
      Face: { roll: '5', penalty: -5 },
      Fin: { roll: '6', penalty: -4, role: EXTREMITY },
      Torso: { roll: '7-12', penalty: 0 },
      'Fin*': { roll: '13-16', penalty: -4, role: EXTREMITY },
      Tail: { roll: '17-18', penalty: -5, role: EXTREMITY },
      Vitals: { roll: '-', penalty: -3 },
    }

    arachnoidHitLocations = {
      Eye: { roll: '-', penalty: -9 },
      Brain: { roll: '3-4', penalty: -7 },
      Neck: { roll: '5', penalty: -5 },
      Face: { roll: '6', penalty: -5 },
      'Leg 1-2': { roll: '7-8', penalty: -2, role: LIMB },
      Torso: { roll: '9-11', penalty: 0 },
      Groin: { roll: '12', penalty: -3 },
      'Leg 3-4': { roll: '13-14', penalty: -2, role: LIMB },
      'Leg 5-6': { roll: '15-16', penalty: -2, role: LIMB },
      'Leg 7-8': { roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { roll: '-', penalty: -3 },
    }

    // Important that GCA keys be directly under GCS keys (as they are duplicates, and should be ignored when listing)
    hitlocationDictionary = {
      humanoid: humanoidHitLocations,
      'humanoid expanded': { ...humanoidHitLocations, ...{ Chest: { roll: '-', penalty: 0 } } }, // GCA
      'winged humanoid': { ...humanoidHitLocations, ...{ Wing: { roll: '-', penalty: -2, role: LIMB } } }, // GCA
      quadruped: quadrupedHitLocations,
      quadrupedWinged: wingedQuadHitLocations,
      'winged quadruped': wingedQuadHitLocations, // GCA
      avian: avianHitLocations,
      centaur: centaurHitLocations,
      hexapod: hexapodHitLocations,
      hexapodWinged: wingedHexHitLocations,
      'winged hexapod': wingedHexHitLocations, // GCA
      vermiform: vermiformHitLocations,
      vermiformWinged: wingedSerpentHitLocations,
      'winged vermiform': wingedSerpentHitLocations, // GCA
      snakeman: snakeManHitLocations, // what we expected from GCS
      octopod: octopodHitLocations,
      squid: squidHitLocations,
      cancroid: cancroidHitLocations,
      scorpion: scorpionHitLocations,
      ichthyoid: ichthyoidHitLocations,
      arachnoid: arachnoidHitLocations,
    }
  }

  /**
   * Given a bodyplan, return the associated hit location table. (Default to 'humanoid').
   *
   * @param {String} bodyplan
   */
  static getHitLocationRolls(bodyplan) {
    if (!bodyplan) {
      bodyplan = HitLocation.HUMANOID
    }
    let table = hitlocationDictionary[bodyplan]
    return !!table ? table : hitlocationDictionary[HitLocation.HUMANOID]
  }

  /**
   * Try to map GCA hit location "where" to GCS/Foundry location
   * GCA might send "Leg 7" which we map to "Leg 7-8"
   */
  static findTableEntry(table, where) {
    if (table.hasOwnProperty(where)) return [where, table[where]]
    if (table.hasOwnProperty(HitLocation.BRAIN) && where == HitLocation.SKULL)
      return [HitLocation.BRAIN, table[HitLocation.BRAIN]]
    var lbl, entry
    let re = /^([A-Za-z]+) *(\d+)/
    let m = where.match(re)
    if (!!m) {
      let t = parseInt(m[2])
      Object.keys(table).forEach(e => {
        if (e.startsWith(m[1])) {
          let indexes = convertRollStringToArrayOfInt(e.split(' ')[1])
          if (indexes.includes(t)) {
            lbl = e
            entry = table[e]
          }
        }
      })
    }
    return [lbl, entry]
  }

  setEquipment(frmttext) {
    let e = extractP(frmttext)
    this.equipment = e.trim().replace('\n', ', ')
  }

  /**
   * Translates this HitLocation to one or more RAW/canonical HitLocations
   * as needed.
   *
   * @returns array of HitLocation
   */
  locations(includeself = false) {
    let entry = hitLocationAlias[this.where]
    if (!entry) {
      return [this]
    }

    // replace non-RAW name with RAW name
    this.where = entry.RAW

    let locations = []
    if (!!entry.prefix) {
      if (includeself) locations.push(this)
      entry.prefix.forEach(it => {
        let location = new HitLocation()
        location.dr = this.dr
        location.equipment = this.equipment
        location.where = `${it} ${this.where}`
        locations.push(location)
      })
    } else locations.push(this)
    return locations
  }
}

export var getHitLocationTableNames = function () {
  let keys = []
  var last
  Object.keys(hitlocationDictionary).forEach(e => {
    let t = hitlocationDictionary[e]
    if (t != last) keys.push(e)
    last = t
  })
  return keys
}

var hitLocationAlias = null
var humanoidHitLocations = null
var quadrupedHitLocations = null
var avianHitLocations = null
var centaurHitLocations = null
var wingedQuadHitLocations = null
var hexapodHitLocations = null
var wingedHexHitLocations = null
var vermiformHitLocations = null
var snakeManHitLocations = null
var wingedSerpentHitLocations = null
var octopodHitLocations = null
var squidHitLocations = null
var cancroidHitLocations = null
var scorpionHitLocations = null
var ichthyoidHitLocations = null
var arachnoidHitLocations = null
