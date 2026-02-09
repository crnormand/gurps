'use strict'

import { convertRollStringToArrayOfInt, extractP } from '@util/utilities.js'

export const LIMB = 'limb'
export const EXTREMITY = 'extremity'
export const CHEST = 'chest'
export const GROIN = 'groin'

// This table is used to display dice rolls and penalties (if they are missing from the import
// data) and to create the HitLocations pulldown menu (skipping any "skip:true" entries).
//
// Use the 'RAW' property to provide the Rules-As-Written hit location name, which is used in the
// per-bodyplan hit location tables, below.
//
// Some entries combine two (or more?) related locations, such as left and right limbs. They will
// have a 'roll' property that uses the ampersand (&) character. Those locations must also include
// a 'prefix' property that will be used when splitting out the combined values into single values.

// FIXME -- Rewrite to get rid of the global references.
export var hitlocationRolls = null

// FIXME -- Rewrite to get rid of the global references.
export var hitlocationDictionary = null

export class HitLocation {
  static VITALS = 'Vitals'
  static TORSO = 'Torso'
  static HUMANOID = 'humanoid'
  static SKULL = 'Skull'
  static BRAIN = 'Brain'
  static DEFAULT = '-'

  constructor(loc = '', dr = '0', penalty = '', roll = HitLocation.DEFAULT, equipment = '') {
    this.where = loc
    this.import = dr // With the introduction of Items, the starting hit location DR level is stored in 'import', and then 'dr' is calculated by the actor
    this.equipment = equipment
    this.penalty = penalty
    this.roll = roll

    return this
  }

  /**
   * To be called from an 'init' Hook.
   */
  static init() {
    // README: The keys in this object literal (Eye, Eyes, Skull, etc...) are directly used in
    // README: the language files for localization, with the prefix 'GURPS.hitLocation' (example:
    // README: 'GURPS.hitLocationEyes'). DO NOT EDIT the keys here, but instead update them in
    // README: the langauge file.
    //
    // README: I'm also updating the desc property to be an array of localization keys.
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
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      'Right Leg': { id: 'leg', roll: '6-7', penalty: -2, role: LIMB },
      'Right Arm': { id: 'arm', roll: '8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-10', penalty: 0, role: CHEST },
      Groin: { id: 'groin', roll: '11', penalty: -3, role: GROIN },
      'Left Arm': { id: 'arm', roll: '12', penalty: -2, role: LIMB },
      'Left Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Hand: { id: 'hand', roll: '15', penalty: -4, role: EXTREMITY },
      Foot: { id: 'foot', roll: '16', penalty: -4, role: EXTREMITY },
      Neck: { id: 'neck', roll: '17-18', penalty: -5 },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    tailedHumanoidHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      'Right Leg': { id: 'leg', roll: '6-7', penalty: -2, role: LIMB },
      'Right Arm': { id: 'arm', roll: '8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-10', penalty: 0 },
      Tail: { id: 'tail', roll: '11', penalty: -3, role: LIMB },
      'Left Arm': { id: 'arm', roll: '12', penalty: -2, role: LIMB },
      'Left Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Hand: { id: 'hand', roll: '15', penalty: -4, role: EXTREMITY },
      Foot: { id: 'foot', roll: '16', penalty: -4, role: EXTREMITY },
      Neck: { id: 'neck', roll: '17-18', penalty: -5 },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    quadrupedHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Foreleg: { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Groin: { id: 'groin', roll: '12', penalty: -3 },
      'Hind Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { id: 'tail', roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    avianHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Wing: { id: 'wing', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Groin: { id: 'groin', roll: '12', penalty: -3 },
      Leg: { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { id: 'tail', roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    centaurHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Neck: { id: 'neck', roll: '5', penalty: -5 },
      Face: { id: 'face', roll: '6', penalty: -5 },
      Foreleg: { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Groin: { id: 'groin', roll: '12', penalty: -3 },
      'Hind Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Arm: { id: 'arm', roll: '15-16', penalty: -2, role: LIMB },
      Extremity: { id: 'hand', roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    wingedQuadHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Foreleg: { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Wing: { id: 'wing', roll: '12', penalty: -2, role: LIMB },
      'Hind Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '15-16', penalty: -4, role: EXTREMITY },
      Tail: { id: 'tail', roll: '17-18', penalty: -3, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    hexapodHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Neck: { id: 'neck', roll: '5', penalty: -5 },
      Face: { id: 'face', roll: '6', penalty: -5 },
      Foreleg: { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-10', penalty: 0 },
      'Mid Leg': { id: 'leg', roll: '11', penalty: -2, role: LIMB },
      Groin: { id: 'groin', roll: '12', penalty: -3 },
      'Hind Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '15-16', penalty: -4, role: EXTREMITY },
      'Mid Leg*': { id: 'leg', roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    wingedHexHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Neck: { id: 'neck', roll: '5', penalty: -5 },
      Face: { id: 'face', roll: '6', penalty: -5 },
      Foreleg: { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-10', penalty: 0 },
      'Mid Leg': { id: 'leg', roll: '11', penalty: -2, role: LIMB },
      Wing: { id: 'wing', roll: '12', penalty: -2, role: LIMB },
      'Hind Leg': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      'Mid Leg*': { id: 'leg', roll: '15-16', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    vermiformHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6-8', penalty: -5 },
      Torso: { id: 'torso', roll: '9-18', penalty: 0 },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    snakeManHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Arm: { id: 'arm', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-12', penalty: 0 },
      'Arm*': { id: 'arm', roll: '13-14', penalty: -2, role: LIMB },
      'Torso*': { id: 'torso', roll: '15-16', penalty: 0 },
      Hand: { id: 'hand', roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    wingedSerpentHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6-8', penalty: -5 },
      Torso: { id: 'torso', roll: '9-14', penalty: 0 },
      Wing: { id: 'wing', roll: '15-18', penalty: -2, role: LIMB },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    octopodHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -8 },
      Brain: { id: 'brain', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      'Arm 1-2': { id: 'arm', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-12', penalty: 0 },
      'Arm 3-4': { id: 'arm', roll: '13-14', penalty: -2, role: LIMB },
      'Arm 5-6': { id: 'arm', roll: '15-16', penalty: -2, role: LIMB },
      'Arm 7-8': { id: 'arm', roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    squidHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -8 },
      Brain: { id: 'brain', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      'Arm 1-2': { id: 'arm', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-12', penalty: 0 },
      Extremity: { id: 'hand', roll: '13-16', penalty: -3, role: EXTREMITY },
      'Torso*': { id: 'torso', roll: '17-18', penalty: -2 },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    cancroidHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Arm: { id: 'arm', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-12', penalty: 0 },
      Leg: { id: 'leg', roll: '13-16', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    scorpionHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Neck: { id: 'neck', roll: '6', penalty: -5 },
      Arm: { id: 'arm', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Tail: { id: 'tail', roll: '12', penalty: -3, role: LIMB },
      Leg: { id: 'leg', roll: '13-16', penalty: -2, role: LIMB },
      Foot: { id: 'foot', roll: '17-18', penalty: -4, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    ichthyoidHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -8 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Fin: { id: 'fin', roll: '6', penalty: -4, role: EXTREMITY },
      Torso: { id: 'torso', roll: '7-12', penalty: 0 },
      'Fin*': { id: 'fin', roll: '13-16', penalty: -4, role: EXTREMITY },
      Tail: { id: 'tail', roll: '17-18', penalty: -5, role: EXTREMITY },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    arachnoidHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Brain: { id: 'brain', roll: '3-4', penalty: -7 },
      Neck: { id: 'neck', roll: '5', penalty: -5 },
      Face: { id: 'face', roll: '6', penalty: -5 },
      'Leg 1-2': { id: 'leg', roll: '7-8', penalty: -2, role: LIMB },
      Torso: { id: 'torso', roll: '9-11', penalty: 0 },
      Groin: { id: 'groin', roll: '12', penalty: -3 },
      'Leg 3-4': { id: 'leg', roll: '13-14', penalty: -2, role: LIMB },
      'Leg 5-6': { id: 'leg', roll: '15-16', penalty: -2, role: LIMB },
      'Leg 7-8': { id: 'leg', roll: '17-18', penalty: -2, role: LIMB },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    mermenHitLocations = {
      Eye: { id: 'eye', roll: '-', penalty: -9 },
      Skull: { id: 'skull', roll: '3-4', penalty: -7 },
      Face: { id: 'face', roll: '5', penalty: -5 },
      Tail: { id: 'tail', roll: '6', penalty: -3, role: EXTREMITY },
      Torso: { id: 'torso', roll: '7', penalty: 0 },
      'Right Arm': { id: 'arm', roll: '8', penalty: -2, role: LIMB },
      'Torso*': { id: 'torso', roll: '9-10', penalty: 0 },
      Groin: { id: 'groin', roll: '11', penalty: -3 },
      'Left Arm': { id: 'arm', roll: '12', penalty: -2, role: LIMB },
      'Torso**': { id: 'torso', roll: '13', penalty: 0 },
      'Tail*': { id: 'tail', roll: '14', penalty: -3, role: EXTREMITY },
      Hand: { id: 'hand', roll: '15', penalty: -4, role: EXTREMITY },
      'Tail**': { id: 'tail', roll: '16', penalty: -3, role: EXTREMITY },
      Neck: { id: 'neck', roll: '17-18', penalty: -5 },
      Vitals: { id: 'vitals', roll: '-', penalty: -3 },
    }

    // Important that GCA keys be directly under GCS keys (as they are duplicates, and should be ignored when listing)
    hitlocationDictionary = {
      humanoid: humanoidHitLocations,
      'humanoid expanded': { ...humanoidHitLocations, ...{ Chest: { roll: '-', penalty: 0 } } }, // GCA
      'winged humanoid': { ...humanoidHitLocations, ...{ Wing: { roll: '-', penalty: -2, role: LIMB } } }, // GCA
      'tailed humanoid': tailedHumanoidHitLocations,
      humanoidTailed: tailedHumanoidHitLocations,
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
      'fish-tailed humanoid': mermenHitLocations,
      mermen: mermenHitLocations,
    }
  }

  /**
   * To be called on Hook.ready
   */
  static ready() {
    translations[game.i18n.localize('GURPS.hitLocationArm, holding shield')] = 'Arm, holding shield'
    translations[game.i18n.localize('GURPS.hitLocationArm')] = 'Arm'
    translations[game.i18n.localize('GURPS.hitLocationBrain')] = 'Brain'
    translations[game.i18n.localize('GURPS.hitLocationChest')] = 'Chest'
    translations[game.i18n.localize('GURPS.hitLocationChinks in Other')] = 'Chinks in Other'
    translations[game.i18n.localize('GURPS.hitLocationChinks in Torso')] = 'Chinks in Torso'
    translations[game.i18n.localize('GURPS.hitLocationExtremity')] = 'Extremity'
    translations[game.i18n.localize('GURPS.hitLocationEye')] = 'Eye'
    translations[game.i18n.localize('GURPS.hitLocationEyes')] = 'Eyes'
    translations[game.i18n.localize('GURPS.hitLocationFace, from behind')] = 'Face, from behind'
    translations[game.i18n.localize('GURPS.hitLocationFace')] = 'Face'
    translations[game.i18n.localize('GURPS.hitLocationFin')] = 'Fin'
    translations[game.i18n.localize('GURPS.hitLocationFoot')] = 'Foot'
    translations[game.i18n.localize('GURPS.hitLocationForeleg')] = 'Foreleg'
    translations[game.i18n.localize('GURPS.hitLocationGroin')] = 'Groin'
    translations[game.i18n.localize('GURPS.hitLocationHand')] = 'Hand'
    translations[game.i18n.localize('GURPS.hitLocationHind Leg')] = 'Hind Leg'
    translations[game.i18n.localize('GURPS.hitLocationJaw')] = 'Jaw'
    translations[game.i18n.localize('GURPS.hitLocationLeft Arm, holding shield')] = 'Left Arm, holding shield'
    translations[game.i18n.localize('GURPS.hitLocationLeft Arm')] = 'Left Arm'
    translations[game.i18n.localize('GURPS.hitLocationLeft Leg')] = 'Left Leg'
    translations[game.i18n.localize('GURPS.hitLocationLeg')] = 'Leg'
    translations[game.i18n.localize('GURPS.hitLocationLimb Vein/Artery')] = 'Limb Vein/Artery'
    translations[game.i18n.localize('GURPS.hitLocationMid Leg')] = 'Mid Leg'
    translations[game.i18n.localize('GURPS.hitLocationNeck Vein/Artery')] = 'Neck Vein/Artery'
    translations[game.i18n.localize('GURPS.hitLocationNeck')] = 'Neck'
    translations[game.i18n.localize('GURPS.hitLocationNose')] = 'Nose'
    translations[game.i18n.localize('GURPS.hitLocationRight Arm, holding shield')] = 'Right Arm, holding shield'
    translations[game.i18n.localize('GURPS.hitLocationRight Arm')] = 'Right Arm'
    translations[game.i18n.localize('GURPS.hitLocationRight Leg')] = 'Right Leg'
    translations[game.i18n.localize('GURPS.hitLocationSkull, from behind')] = 'Skull, from behind'
    translations[game.i18n.localize('GURPS.hitLocationSkull')] = 'Skull'
    translations[game.i18n.localize('GURPS.hitLocationTail')] = 'Tail'
    translations[game.i18n.localize('GURPS.hitLocationTorso')] = 'Torso'
    translations[game.i18n.localize('GURPS.hitLocationVitals, Heart')] = 'Vitals, Heart'
    translations[game.i18n.localize('GURPS.hitLocationVitals')] = 'Vitals'
    translations[game.i18n.localize('GURPS.hitLocationWhere')] = 'Where'
    translations[game.i18n.localize('GURPS.hitLocationWing')] = 'Wing'
  }

  static translate(text) {
    return translations[text] ? translations[text] : text
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

    return table ? table : hitlocationDictionary[HitLocation.HUMANOID]
  }

  /**
   * Try to map GCA hit location "where" to GCS/Foundry location
   * GCA might send "Leg 7" which we map to "Leg 7-8"
   */
  static findTableEntry(table, where) {
    if (Object.hasOwn(table, where)) return [where, table[where]]
    if (Object.hasOwn(table, HitLocation.BRAIN) && where == HitLocation.SKULL)
      return [HitLocation.BRAIN, table[HitLocation.BRAIN]]
    var lbl, entry
    let re = /^([A-Za-z]+) *(\d+)/
    let match = where.match(re)

    if (match) {
      let location = parseInt(match[2])

      Object.keys(table).forEach(tableKey => {
        if (tableKey.startsWith(match[1])) {
          let indexes = convertRollStringToArrayOfInt(tableKey.split(' ')[1])

          if (indexes.includes(location)) {
            lbl = tableKey
            entry = table[tableKey]
          }
        }
      })
    }

    return [lbl, entry]
  }

  setEquipment(frmttext) {
    let equipmentText = extractP(frmttext)

    this.equipment = equipmentText.trim().replace('\n', ', ')
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

    if (entry.prefix) {
      if (includeself) locations.push(this)
      entry.prefix.forEach(it => {
        let location = new HitLocation()

        location.import = this.import
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

  Object.keys(hitlocationDictionary).forEach(hitLocationTableName => {
    let table = hitlocationDictionary[hitLocationTableName]

    if (table != last) keys.push(hitLocationTableName)
    last = table
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
var tailedHumanoidHitLocations = null
var mermenHitLocations = null
var translations = {}
